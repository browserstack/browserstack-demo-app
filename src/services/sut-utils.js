// Load Testing SUT Utilities

const DUMMY_USERNAME = 'testuser';
const DUMMY_PASSWORD = 'password';

// In-memory "session" store for load testing SUT
const sessions = {};

// --- Utility Functions ---

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Base HTML template with modern styling
const getBaseHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SUT - ${title}</title>
    <style>
        body { font-family: 'Inter', sans-serif; margin: 0; background-color: #f4f7f9; color: #333; }
        .container { max-width: 1200px; margin: 40px auto; padding: 20px; }
        .card { background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 24px; margin-bottom: 20px; }
        .header { text-align: center; margin-bottom: 30px; color: #1e3a8a; }
        h1 { margin: 0; font-size: 2.5rem; }
        h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; color: #4a5568; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .test-link { display: block; padding: 16px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.1s, box-shadow 0.1s; }
        .test-link:hover { transform: translateY(-3px); box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15); }
        .success { background-color: #d1fae5; color: #065f46; border: 1px solid #10b981; }
        .warning { background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
        .danger { background-color: #fee2e2; color: #991b1b; border: 1px solid #ef4444; }
        .info { background-color: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
        .btn-primary { background-color: #1e3a8a; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; transition: background-color 0.2s; }
        .btn-primary:hover { background-color: #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${title}</h1>
            <small>Custom Load Testing System Under Test (SUT)</small>
        </header>
        ${bodyContent}
    </div>
</body>
</html>
`;

module.exports = {
    DUMMY_USERNAME,
    DUMMY_PASSWORD,
    sessions,
    delay,
    getBaseHtml,
    generateSessionId
};
