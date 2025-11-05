# Exemplos de Código - Sistema Administrativo Independente

**Projeto:** Laboratório de Fonética UFRJ  
**Componente:** Backend de Administração PHP  
**Status:** Proposta de Implementação

---

## 📋 Índice

1. [Sistema de Autenticação](#sistema-de-autenticação)
2. [Gerenciamento de Usuários](#gerenciamento-de-usuários)
3. [Interface de Login](#interface-de-login)
4. [Dashboard Administrativo](#dashboard-administrativo)
5. [Salvamento de Dados](#salvamento-de-dados)
6. [Estilos CSS](#estilos-css)
7. [JavaScript](#javascript)
8. [Segurança](#segurança)

---

## Sistema de Autenticação

### `admin/auth/session.php`

```php
<?php
/**
 * Gerenciamento de Sessão - Lab Fonética Admin
 * Sistema independente do WordPress
 */

// Configurações de segurança da sessão
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Mudar para 1 se HTTPS disponível

// Inicia sessão com nome único (não conflita com WordPress)
session_name('LABFONAC_SESSION');
session_start();

// Tempo de expiração: 2 horas
define('SESSION_TIMEOUT', 7200);

/**
 * Verifica se usuário está autenticado
 */
function isAuthenticated() {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['last_activity'])) {
        return false;
    }
    
    // Verifica timeout
    if (time() - $_SESSION['last_activity'] > SESSION_TIMEOUT) {
        logout();
        return false;
    }
    
    // Atualiza último acesso
    $_SESSION['last_activity'] = time();
    return true;
}

/**
 * Faz login do usuário
 */
function login($userId, $username) {
    session_regenerate_id(true); // Previne session fixation
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;
    $_SESSION['last_activity'] = time();
    $_SESSION['ip_address'] = $_SERVER['REMOTE_ADDR'];
}

/**
 * Faz logout
 */
function logout() {
    $_SESSION = array();
    
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time()-3600, '/');
    }
    
    session_destroy();
}

/**
 * Obtém usuário atual
 */
function getCurrentUser() {
    if (!isAuthenticated()) {
        return null;
    }
    
    return array(
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username']
    );
}

/**
 * Verifica autenticação ou redireciona
 */
function requireAuth() {
    if (!isAuthenticated()) {
        header('Location: login.php?redirect=' . urlencode($_SERVER['REQUEST_URI']));
        exit;
    }
}
?>
```

---

## Gerenciamento de Usuários

### `admin/auth/users.php`

```php
<?php
/**
 * Gerenciamento de Usuários - Lab Fonética Admin
 */

define('USERS_FILE', __DIR__ . '/users.json');

/**
 * Carrega usuários do arquivo JSON
 */
function loadUsers() {
    if (!file_exists(USERS_FILE)) {
        // Cria arquivo inicial com usuário admin padrão
        $defaultUsers = array(
            array(
                'id' => 1,
                'username' => 'admin',
                'password' => password_hash('labfonac2025', PASSWORD_DEFAULT),
                'name' => 'Administrador',
                'email' => 'admin@labfonac.ufrj.br',
                'created_at' => date('Y-m-d H:i:s')
            )
        );
        saveUsers($defaultUsers);
        return $defaultUsers;
    }
    
    $json = file_get_contents(USERS_FILE);
    return json_decode($json, true);
}

/**
 * Salva usuários no arquivo JSON
 */
function saveUsers($users) {
    $json = json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    file_put_contents(USERS_FILE, $json);
    chmod(USERS_FILE, 0600); // Somente leitura/escrita pelo owner
}

/**
 * Autentica usuário
 */
function authenticateUser($username, $password) {
    $users = loadUsers();
    
    foreach ($users as $user) {
        if ($user['username'] === $username) {
            if (password_verify($password, $user['password'])) {
                return $user;
            }
        }
    }
    
    return false;
}

/**
 * Cria novo usuário
 */
function createUser($username, $password, $name, $email) {
    $users = loadUsers();
    
    // Verifica se username já existe
    foreach ($users as $user) {
        if ($user['username'] === $username) {
            return false;
        }
    }
    
    $newUser = array(
        'id' => count($users) + 1,
        'username' => $username,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'name' => $name,
        'email' => $email,
        'created_at' => date('Y-m-d H:i:s')
    );
    
    $users[] = $newUser;
    saveUsers($users);
    
    return $newUser;
}

/**
 * Altera senha de usuário
 */
function changePassword($userId, $newPassword) {
    $users = loadUsers();
    
    foreach ($users as &$user) {
        if ($user['id'] === $userId) {
            $user['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
            saveUsers($users);
            return true;
        }
    }
    
    return false;
}
?>
```

---

## Interface de Login

### `admin/login.php`

```php
<?php
/**
 * Página de Login - Lab Fonética Admin
 */
require_once 'auth/session.php';
require_once 'auth/users.php';

// Se já está logado, redireciona para dashboard
if (isAuthenticated()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';

// Processa login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $error = 'Por favor, preencha todos os campos.';
    } else {
        $user = authenticateUser($username, $password);
        
        if ($user) {
            login($user['id'], $user['username']);
            
            // Redireciona para página solicitada ou dashboard
            $redirect = $_GET['redirect'] ?? 'dashboard.php';
            header('Location: ' . $redirect);
            exit;
        } else {
            $error = 'Usuário ou senha inválidos.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Laboratório de Fonética UFRJ</title>
    <link rel="stylesheet" href="css/admin.css">
</head>
<body class="login-page">
    <div class="login-container">
        <div class="login-box">
            <div class="login-header">
                <h1>Laboratório de Fonética</h1>
                <p>Universidade Federal do Rio de Janeiro</p>
            </div>
            
            <?php if ($error): ?>
                <div class="alert alert-error">
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" action="" class="login-form">
                <div class="form-group">
                    <label for="username">Usuário</label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        required 
                        autofocus
                        autocomplete="username"
                    >
                </div>
                
                <div class="form-group">
                    <label for="password">Senha</label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        autocomplete="current-password"
                    >
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    Entrar
                </button>
            </form>
            
            <div class="login-footer">
                <p><small>Sistema de administração independente</small></p>
                <a href="../index.html">← Voltar ao site público</a>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## Dashboard Administrativo

### `admin/dashboard.php` (Versão Simplificada)

```php
<?php
/**
 * Dashboard - Lab Fonética Admin
 */
require_once 'auth/session.php';
requireAuth(); // Força autenticação

$user = getCurrentUser();
$contentFile = '../data/content.json';

// Carrega conteúdo atual
$content = json_decode(file_get_contents($contentFile), true);

// Mensagem de sucesso (após salvar)
$success = $_GET['success'] ?? '';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Administrativo - Lab Fonética</title>
    <link rel="stylesheet" href="css/admin.css">
</head>
<body class="admin-page">
    <header class="admin-header">
        <div class="container">
            <h1>Painel Administrativo</h1>
            <nav class="admin-nav">
                <span>Olá, <strong><?php echo htmlspecialchars($user['username']); ?></strong></span>
                <a href="../index.html" target="_blank">Ver Site</a>
                <a href="logout.php">Sair</a>
            </nav>
        </div>
    </header>
    
    <main class="admin-main">
        <div class="container">
            <?php if ($success === 'saved'): ?>
                <div class="alert alert-success">
                    ✓ Conteúdo salvo com sucesso!
                </div>
            <?php endif; ?>
            
            <form method="POST" action="save.php" id="contentForm">
                <h2>Conteúdo Principal</h2>
                
                <div class="form-group">
                    <label for="title">Título do Site</label>
                    <input 
                        type="text" 
                        id="title" 
                        name="title" 
                        class="form-control"
                        value="<?php echo htmlspecialchars($content['title'] ?? ''); ?>"
                        required
                    >
                </div>
                
                <div class="form-group">
                    <label for="subtitle">Subtítulo</label>
                    <input 
                        type="text" 
                        id="subtitle" 
                        name="subtitle" 
                        class="form-control"
                        value="<?php echo htmlspecialchars($content['subtitle'] ?? ''); ?>"
                    >
                </div>
                
                <div class="form-group">
                    <label for="description">Descrição</label>
                    <textarea 
                        id="description" 
                        name="description" 
                        class="form-control"
                        rows="6"
                        required
                    ><?php echo htmlspecialchars($content['description'] ?? ''); ?></textarea>
                    <small class="form-hint">Esta descrição aparece na página inicial</small>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.open('../index.html')">
                        👁️ Pré-visualizar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        💾 Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    </main>
    
    <script src="js/admin.js"></script>
</body>
</html>
```

---

## Salvamento de Dados

### `admin/save.php`

```php
<?php
/**
 * Processa salvamento de conteúdo - Lab Fonética Admin
 */
require_once 'auth/session.php';
requireAuth();

$contentFile = '../data/content.json';
$backupDir = '../data/backups';

// Cria diretório de backups se não existe
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0775, true);
}

// Faz backup do arquivo atual
if (file_exists($contentFile)) {
    $backupFile = $backupDir . '/content_' . date('Y-m-d_H-i-s') . '.json';
    copy($contentFile, $backupFile);
    
    // Remove backups antigos (mantém últimos 10)
    $backups = glob($backupDir . '/content_*.json');
    if (count($backups) > 10) {
        usort($backups, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        
        $toDelete = array_slice($backups, 0, count($backups) - 10);
        foreach ($toDelete as $file) {
            unlink($file);
        }
    }
}

// Processa dados do formulário
$data = array(
    'title' => $_POST['title'] ?? '',
    'subtitle' => $_POST['subtitle'] ?? '',
    'description' => $_POST['description'] ?? '',
    'team' => $_POST['team'] ?? [],
    'updated_at' => date('Y-m-d H:i:s'),
    'updated_by' => getCurrentUser()['username']
);

// Valida dados
$errors = [];

if (empty($data['title'])) {
    $errors[] = 'Título é obrigatório';
}

if (empty($data['description'])) {
    $errors[] = 'Descrição é obrigatória';
}

if (!empty($errors)) {
    $_SESSION['errors'] = $errors;
    header('Location: dashboard.php');
    exit;
}

// Salva JSON
$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents($contentFile, $json);

// Redireciona com mensagem de sucesso
header('Location: dashboard.php?success=saved');
exit;
?>
```

### `admin/logout.php`

```php
<?php
/**
 * Logout - Lab Fonética Admin
 */
require_once 'auth/session.php';

logout();

header('Location: login.php');
exit;
?>
```

### `admin/index.php`

```php
<?php
/**
 * Index - Redireciona para login ou dashboard
 */
require_once 'auth/session.php';

if (isAuthenticated()) {
    header('Location: dashboard.php');
} else {
    header('Location: login.php');
}
exit;
?>
```

---

## Estilos CSS

### `admin/css/admin.css`

```css
/**
 * Estilos do Painel Administrativo - Lab Fonética
 */

/* Reset e Base */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f5f5f5;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* === PÁGINA DE LOGIN === */
.login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
    width: 100%;
    max-width: 400px;
    padding: 20px;
}

.login-box {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    padding: 40px;
}

.login-header {
    text-align: center;
    margin-bottom: 30px;
}

.login-header h1 {
    font-size: 24px;
    color: #333;
    margin-bottom: 5px;
}

.login-header p {
    font-size: 14px;
    color: #666;
}

.login-form {
    margin-bottom: 20px;
}

.login-footer {
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.login-footer a {
    color: #667eea;
    text-decoration: none;
}

.login-footer a:hover {
    text-decoration: underline;
}

/* === FORMULÁRIOS === */
.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
}

.form-control {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s;
}

.form-control:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

textarea.form-control {
    resize: vertical;
    font-family: inherit;
}

.form-hint {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    color: #666;
}

/* === BOTÕES === */
.btn {
    display: inline-block;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    text-decoration: none;
}

.btn-primary {
    background: #667eea;
    color: white;
}

.btn-primary:hover {
    background: #5568d3;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
}

.btn-block {
    display: block;
    width: 100%;
}

/* === ALERTAS === */
.alert {
    padding: 15px 20px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.alert-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.alert-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

/* === HEADER DO ADMIN === */
.admin-header {
    background: white;
    border-bottom: 1px solid #eee;
    padding: 15px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.admin-header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.admin-header h1 {
    font-size: 20px;
    color: #333;
}

.admin-nav {
    display: flex;
    align-items: center;
    gap: 20px;
}

.admin-nav a {
    color: #667eea;
    text-decoration: none;
    font-size: 14px;
}

.admin-nav a:hover {
    text-decoration: underline;
}

/* === CONTEÚDO DO ADMIN === */
.admin-main {
    padding: 30px 0;
}

.admin-main h2 {
    font-size: 24px;
    margin-bottom: 20px;
    color: #333;
}

/* === AÇÕES DO FORMULÁRIO === */
.form-actions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid #eee;
    display: flex;
    gap: 15px;
    justify-content: flex-end;
}

/* === RESPONSIVO === */
@media (max-width: 768px) {
    .form-actions {
        flex-direction: column;
    }
    
    .form-actions .btn {
        width: 100%;
    }
}
```

---

## JavaScript

### `admin/js/admin.js`

```javascript
/**
 * JavaScript do Painel Administrativo - Lab Fonética
 */

document.addEventListener('DOMContentLoaded', function() {
    
    const form = document.getElementById('contentForm');
    let formChanged = false;
    
    // === DETECTA MUDANÇAS NO FORMULÁRIO ===
    if (form) {
        form.addEventListener('change', function() {
            formChanged = true;
        });
        
        form.addEventListener('submit', function() {
            formChanged = false;
        });
    }
    
    // === CONFIRMAÇÃO ANTES DE SAIR SEM SALVAR ===
    window.addEventListener('beforeunload', function(e) {
        if (formChanged) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
    
    // === AUTO-SALVAMENTO (DRAFT) ===
    function autoSave() {
        if (!formChanged || !form) return;
        
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // Salva no localStorage como backup
        localStorage.setItem('labfonac_draft', JSON.stringify({
            data: data,
            timestamp: new Date().toISOString()
        }));
        
        console.log('Draft salvo automaticamente');
    }
    
    // Auto-salva a cada 2 minutos
    setInterval(autoSave, 120000);
    
    // === RESTAURAR DRAFT ===
    function checkDraft() {
        const draft = localStorage.getItem('labfonac_draft');
        if (draft) {
            const parsed = JSON.parse(draft);
            const timestamp = new Date(parsed.timestamp);
            const now = new Date();
            const diffMinutes = (now - timestamp) / 1000 / 60;
            
            if (diffMinutes < 60) {
                if (confirm('Existe um rascunho salvo há ' + Math.round(diffMinutes) + ' minutos. Deseja restaurá-lo?')) {
                    // Restaurar valores do form
                    Object.keys(parsed.data).forEach(key => {
                        const field = form.querySelector(`[name="${key}"]`);
                        if (field) {
                            field.value = parsed.data[key];
                        }
                    });
                }
            }
            
            // Limpa draft antigo
            if (diffMinutes > 60) {
                localStorage.removeItem('labfonac_draft');
            }
        }
    }
    
    if (form) {
        checkDraft();
    }
    
});
```

---

## Segurança

### `admin/.htaccess`

```apache
# Proteção adicional do diretório admin
# Bloqueia acesso a arquivos sensíveis

<Files "users.json">
    Order Allow,Deny
    Deny from all
</Files>

# Força HTTPS (se disponível)
# RewriteEngine On
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Desabilita listagem de diretórios
Options -Indexes

# Proteção contra injeção de código
php_flag display_errors Off
php_flag log_errors On
php_value error_log /path/to/logs/php_errors.log
```

---

## Estrutura JSON de Usuários

### `admin/auth/users.json` (exemplo)

```json
[
  {
    "id": 1,
    "username": "admin",
    "password": "$2y$10$YourBcryptHashHere...",
    "name": "Administrador",
    "email": "admin@labfonac.ufrj.br",
    "role": "admin",
    "created_at": "2025-11-05 10:00:00"
  },
  {
    "id": 2,
    "username": "coordenador",
    "password": "$2y$10$AnotherBcryptHashHere...",
    "name": "Prof. Dr. João Silva",
    "email": "joao@labfonac.ufrj.br",
    "role": "admin",
    "created_at": "2025-11-05 11:30:00"
  },
  {
    "id": 3,
    "username": "editor",
    "password": "$2y$10$YetAnotherBcryptHash...",
    "name": "Maria Santos",
    "email": "maria@labfonac.ufrj.br",
    "role": "editor",
    "created_at": "2025-11-05 14:00:00"
  }
]
```

---

## Estrutura JSON de Conteúdo

### `data/content.json` (exemplo)

```json
{
  "title": "Laboratório de Fonética Experimental",
  "subtitle": "Universidade Federal do Rio de Janeiro",
  "description": "O Laboratório de Fonética Experimental da UFRJ desenvolve pesquisas nas áreas de fonética acústica, percepção de fala e processamento de linguagem natural.",
  "team": [
    {
      "name": "Prof. Dr. João Silva",
      "role": "Coordenador",
      "bio": "Doutor em Linguística pela UFRJ, especialista em fonética acústica com mais de 15 anos de experiência.",
      "photo": "assets/uploads/joao-silva.jpg",
      "email": "joao@labfonac.ufrj.br",
      "lattes": "http://lattes.cnpq.br/1234567890"
    },
    {
      "name": "Profa. Dra. Maria Santos",
      "role": "Pesquisadora",
      "bio": "Doutora em Ciências da Computação, foco em processamento de fala e inteligência artificial.",
      "photo": "assets/uploads/maria-santos.jpg",
      "email": "maria@labfonac.ufrj.br",
      "lattes": "http://lattes.cnpq.br/0987654321"
    }
  ],
  "research": [
    {
      "title": "Análise Acústica de Vogais do Português Brasileiro",
      "description": "Estudo detalhado das características acústicas das vogais em diferentes contextos fonéticos, incluindo análise de formantes e duração.",
      "year": 2024,
      "status": "em andamento",
      "funding": "CNPq",
      "team_members": ["João Silva", "Maria Santos"]
    },
    {
      "title": "Percepção de Contrastes Fonológicos por Falantes de L2",
      "description": "Investigação sobre como falantes não-nativos percebem contrastes fonológicos do português.",
      "year": 2023,
      "status": "concluído",
      "funding": "FAPERJ",
      "team_members": ["Maria Santos"]
    }
  ],
  "publications": [
    {
      "title": "Vowel Duration in Brazilian Portuguese",
      "authors": ["Silva, J.", "Santos, M."],
      "journal": "Journal of Phonetics",
      "year": 2024,
      "doi": "10.1016/j.wocn.2024.xxxxx"
    }
  ],
  "contact": {
    "email": "labfonac@letras.ufrj.br",
    "phone": "(21) 3938-xxxx",
    "address": "Av. Horácio Macedo, 2151 - Cidade Universitária, Rio de Janeiro - RJ",
    "room": "Sala XXX - Faculdade de Letras"
  },
  "updated_at": "2025-11-05 14:30:00",
  "updated_by": "coordenador"
}
```

---

## Notas de Implementação

### Ordem de Upload via SFTP

1. **Criar diretórios:**
   ```
   wp-content/labfonac/
   wp-content/labfonac/admin/
   wp-content/labfonac/admin/auth/
   wp-content/labfonac/admin/css/
   wp-content/labfonac/admin/js/
   wp-content/labfonac/data/
   wp-content/labfonac/data/backups/
   wp-content/labfonac/assets/uploads/
   ```

2. **Upload de arquivos PHP:**
   - `admin/index.php`
   - `admin/login.php`
   - `admin/dashboard.php`
   - `admin/save.php`
   - `admin/logout.php`
   - `admin/auth/session.php`
   - `admin/auth/users.php`

3. **Upload de recursos:**
   - `admin/css/admin.css`
   - `admin/js/admin.js`
   - `admin/.htaccess`

4. **Criar arquivo inicial de conteúdo:**
   - `data/content.json` (com estrutura básica)

5. **Ajustar permissões via SSH ou SFTP:**
   ```bash
   chmod 775 data/
   chmod 775 data/backups/
   chmod 775 assets/uploads/
   chmod 644 admin/*.php
   chmod 644 admin/auth/*.php
   ```

### Primeiro Acesso

1. Acessar: `https://seusite.com/wp-content/labfonac/admin/`
2. Fazer login com credenciais padrão
3. **IMPORTANTE:** Alterar senha imediatamente
4. Criar usuários adicionais conforme necessário

### Segurança Pós-Instalação

- [ ] Alterar senha padrão do admin
- [ ] Verificar permissões de arquivos
- [ ] Testar proteção do `.htaccess`
- [ ] Configurar monitoramento de logs
- [ ] Adicionar ao backup regular

---

**Documento criado em:** 05/11/2025  
**Versão:** 1.0  
**Autor:** Sistema de Documentação - Lab Fonética UFRJ
