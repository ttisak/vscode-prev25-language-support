const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Language ID for Prev25
const LANGUAGE_ID = 'prev25';

// Get configuration values
function getConfig() {
    const config = vscode.workspace.getConfiguration('prev25');
    return {
        binDir: config.get('binDirectory', '/home/tim/p/prev25/bin'),
        antlrJar: config.get('antlrJarPath', '/home/tim/p/prev25/lib/antlr-4.13.2-complete.jar')
    };
}

// Prev25 keywords and built-in types
const KEYWORDS = [
    'typ', 'var', 'fun', 'if', 'then', 'else', 'end', 'while', 'do', 
    'let', 'in', 'return', 'void', 'true', 'false', 'null', 'sizeof'
];

const BUILTIN_TYPES = ['int', 'char', 'bool', 'void'];

const SNIPPETS = [
    {
        label: 'if-then-else',
        insertText: 'if ${1:condition} then\n\t${2}\nelse\n\t${3}\nend',
        detail: 'If-then-else statement',
        documentation: 'Create a new if-then-else statement'
    },
    {
        label: 'if-then',
        insertText: 'if ${1:condition} then\n\t${2}\nend',
        detail: 'If-then statement',
        documentation: 'Create a new if-then statement'
    },
    {
        label: 'while-do',
        insertText: 'while ${1:condition} do\n\t${2}\nend',
        detail: 'While-do statement',
        documentation: 'Create a new while-do loop'
    },
    {
        label: 'function',
        insertText: 'fun ${1:name}(${2:params}): ${3:returnType} =\n\t${4}\n',
        detail: 'Function definition',
        documentation: 'Create a new function definition'
    },
    {
        label: 'let-in',
        insertText: 'let\n\t${1:definitions}\nin\n\t${2:expressions}\nend',
        detail: 'Let-in statement',
        documentation: 'Create a new let-in statement'
    },
    {
        label: 'external-function',
        insertText: 'fun ${1:name}(${2:params}): ${3:returnType}',
        detail: 'External function declaration',
        documentation: 'Create a declaration for an external function (no implementation)'
    }
];

/**
 * Extension activation function
 * @param {vscode.ExtensionContext} context 
 */
function activate(context) {
    console.log('Prev25 extension is now active');

    // Create diagnostic collection for compiler errors
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('prev25');
    context.subscriptions.push(diagnosticCollection);

    // Register completion provider for keywords
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        LANGUAGE_ID,
        {
            provideCompletionItems(document, position, token, context) {
                const completionItems = [];

                // Add keywords
                KEYWORDS.forEach(keyword => {
                    const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                    item.detail = `Prev25 keyword`;
                    completionItems.push(item);
                });

                // Add built-in types
                BUILTIN_TYPES.forEach(type => {
                    const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.TypeParameter);
                    item.detail = `Built-in type`;
                    completionItems.push(item);
                });

                // Add structure snippets
                SNIPPETS.forEach(snippet => {
                    const item = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Snippet);
                    item.insertText = new vscode.SnippetString(snippet.insertText);
                    item.detail = snippet.detail;
                    item.documentation = snippet.documentation;
                    completionItems.push(item);
                });

                return completionItems;
            }
        }
    );
    context.subscriptions.push(completionProvider);


    // Analyze file on save
    const onDidSaveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === LANGUAGE_ID) {
            analyzePrev25File(document, diagnosticCollection);
        }
    });
    context.subscriptions.push(onDidSaveDisposable);

    // Analyze current file if it's a Prev25 file
    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === LANGUAGE_ID) {
        analyzePrev25File(vscode.window.activeTextEditor.document, diagnosticCollection);
    }

    // Listen for configuration changes
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('prev25')) {
            // Re-analyze current file if configuration changed
            if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === LANGUAGE_ID) {
                analyzePrev25File(vscode.window.activeTextEditor.document, diagnosticCollection);
            }
        }
    });
    context.subscriptions.push(configChangeDisposable);

    
}

/**
 * Analyze a Prev25 file for compiler errors
 * @param {vscode.TextDocument} document 
 * @param {vscode.DiagnosticCollection} collection 
 */
function analyzePrev25File(document, collection) {
    // Create temporary file
    const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}_${path.basename(document.fileName)}`);
    fs.writeFileSync(tempFilePath, document.getText());

    try {
        const config = getConfig();
        const classpath = `${config.antlrJar}:${config.binDir}`;
        
        const javaProcess = spawn('java', [
            '-cp', classpath,
            'compiler.Compiler',
            '--dev-mode=on',
            '--target=seman',
            '--logged-phase=seman',
            `--src-file-name=${tempFilePath}`
        ]);

        let stdout = '';
        let stderr = '';

        javaProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        javaProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        javaProcess.on('close', (code) => {
            processCompilerOutput(document, collection, stdout, stderr);
            cleanupTempFile(tempFilePath);
        });

        javaProcess.on('error', (error) => {
            console.error('Compiler error:', error);
            cleanupTempFile(tempFilePath);
        });
    } catch (error) {
        console.error('Failed to run compiler:', error);
        cleanupTempFile(tempFilePath);
    }
}

/**
 * Process compiler output and create diagnostics
 * @param {vscode.TextDocument} document 
 * @param {vscode.DiagnosticCollection} collection 
 * @param {string} stdout 
 * @param {string} stderr 
 */
function processCompilerOutput(document, collection, stdout, stderr) {
    collection.delete(document.uri);
    
    const fullOutput = stdout + stderr;
    const diagnostics = parsePrev25Errors(fullOutput);
    
    if (diagnostics.length > 0) {
        collection.set(document.uri, diagnostics);
    }
}

/**
 * Parse compiler output for errors
 * @param {string} output 
 * @returns {vscode.Diagnostic[]}
 */
function parsePrev25Errors(output) {
    const diagnostics = [];
    const errorRegex = /:-\(\s+\[(\d+)\.(\d+)\s*-\s*(\d+)\.(\d+)\](?::|)\s+(.*)/g;
    
    let match;
    while ((match = errorRegex.exec(output)) !== null) {
        const startLine = parseInt(match[1]) - 1; // Convert to 0-based
        const startColumn = parseInt(match[2]) - 1;
        const endLine = parseInt(match[3]) - 1;
        const endColumn = parseInt(match[4]) - 1;
        const message = match[5];
        
        const range = new vscode.Range(startLine, startColumn, endLine, endColumn + 1);
        const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
        diagnostics.push(diagnostic);
    }
    
    return diagnostics;
}

/**
 * Clean up temporary file
 * @param {string} tempFilePath 
 */
function cleanupTempFile(tempFilePath) {
    try {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    } catch (error) {
        console.error('Failed to cleanup temp file:', error);
    }
}

/**
 * Extension deactivation function
 */
function deactivate() {
    console.log('Prev25 extension is deactivated');
}

module.exports = {
    activate,
    deactivate
};
