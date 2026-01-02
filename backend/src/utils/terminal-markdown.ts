import chalk from "chalk";
import { highlight } from "cli-highlight";

/**
 * ChatGPT-like markdown-to-terminal renderer
 * Converts markdown to beautifully styled terminal output with syntax highlighting
 * Strips all raw markdown symbols for clean display
 */
export function renderMarkdownToTerminal(markdown: string): string {
    let result = markdown;

    // Store code blocks with unique placeholders
    const codeBlocks: string[] = [];
    
    // Match code blocks with optional language identifier (handle various line endings)
    result = result.replace(/```(\w*)\r?\n([\s\S]*?)```/g, (_match, lang, code) => {
        const placeholder = `<<<CODEBLOCK${codeBlocks.length}>>>`;
        
        // Apply syntax highlighting using cli-highlight
        let highlightedCode: string;
        try {
            highlightedCode = highlight(code.trim(), {
                language: lang || 'plaintext',
                ignoreIllegals: true,
                theme: {
                    keyword: chalk.magenta,
                    built_in: chalk.cyan,
                    type: chalk.cyan,
                    literal: chalk.bold.white,
                    number: chalk.yellow,
                    regexp: chalk.red,
                    string: chalk.green,
                    subst: chalk.white,
                    symbol: chalk.bold.white,
                    class: chalk.bold.white,
                    function: chalk.yellow,
                    title: chalk.bold.white,
                    params: chalk.white,
                    comment: chalk.gray.italic,
                    doctag: chalk.green,
                    meta: chalk.gray,
                    'meta-keyword': chalk.magenta,
                    'meta-string': chalk.green,
                    section: chalk.bold.white,
                    tag: chalk.bold.white,
                    name: chalk.bold.white,
                    'builtin-name': chalk.bold.white,
                    attr: chalk.cyan,
                    attribute: chalk.cyan,
                    variable: chalk.red,
                    bullet: chalk.bold.white,
                    code: chalk.green,
                    emphasis: chalk.italic,
                    strong: chalk.bold,
                    formula: chalk.yellow,
                    link: chalk.cyan.underline,
                    quote: chalk.gray.italic,
                    'selector-tag': chalk.bold.white,
                    'selector-id': chalk.bold.white,
                    'selector-class': chalk.bold.white,
                    'selector-attr': chalk.cyan,
                    'selector-pseudo': chalk.cyan,
                    'template-tag': chalk.magenta,
                    'template-variable': chalk.red,
                    addition: chalk.green,
                    deletion: chalk.red,
                    default: chalk.white,
                }
            });
        } catch {
            // Fallback if highlighting fails
            highlightedCode = chalk.white(code.trim());
        }

        // Format the code block with borders and language label
        const border = chalk.gray('─'.repeat(50));
        const langLabel = lang ? chalk.dim.italic(`  [${lang}]`) : '';
        
        const formattedLines = highlightedCode
            .split('\n')
            .map(line => chalk.gray('  ') + line)
            .join('\n');

        const codeBlock = `\n${border}${langLabel}\n${formattedLines}\n${border}\n`;
        
        codeBlocks.push(codeBlock);
        return placeholder;
    });

    // Headings - convert to styled text (remove # symbols)
    result = result.replace(/^#{6}\s+(.+)$/gm, (_match, text) => chalk.bold.white(`      ${text}`));
    result = result.replace(/^#{5}\s+(.+)$/gm, (_match, text) => chalk.bold.white(`    ${text}`));
    result = result.replace(/^#{4}\s+(.+)$/gm, (_match, text) => chalk.bold.white(`   ${text}`));
    result = result.replace(/^#{3}\s+(.+)$/gm, (_match, text) => chalk.bold.white(`  ${text}`));
    result = result.replace(/^#{2}\s+(.+)$/gm, (_match, text) => `\n${chalk.bold.white(text)}\n`);
    result = result.replace(/^#{1}\s+(.+)$/gm, (_match, text) => `\n${chalk.bold.white.underline(text)}\n`);

    // Horizontal rules (remove --- or *** or ___)
    result = result.replace(/^[-*_]{3,}\s*$/gm, chalk.gray('─'.repeat(50)));

    // Inline code (`code`) - replace backticks with styled text
    result = result.replace(/`([^`\n\r]+)`/g, (_match, code) => chalk.bold.white(code));

    // Bold text (**text** or __text__) - remove asterisks/underscores
    result = result.replace(/\*\*(.+?)\*\*/g, (_match, text) => chalk.bold.white(text));
    result = result.replace(/__(.+?)__/g, (_match, text) => chalk.bold.white(text));

    // Italic text (*text* or _text_) - remove asterisks/underscores  
    result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, (_match, text) => chalk.italic(text));
    result = result.replace(/(?<!_)_([^_]+?)_(?!_)/g, (_match, text) => chalk.italic(text));

    // Strikethrough (~~text~~) - remove tildes
    result = result.replace(/~~(.+?)~~/g, (_match, text) => chalk.strikethrough.dim(text));

    // Links [text](url) - convert to styled text
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) =>
        `${chalk.white.underline(text)} ${chalk.gray.dim(`(${url})`)}`
    );

    // Blockquotes (> text) - remove > symbol
    result = result.replace(/^>\s+(.+)$/gm, (_match, text) => 
        chalk.gray('  │ ') + chalk.italic.gray(text)
    );

    // Unordered lists (- item or * item or + item) - convert to bullet
    result = result.replace(/^(\s*)[-*+]\s+(.+)$/gm, (_match, indent, text) =>
        `${indent}  ${chalk.white('•')} ${text}`
    );

    // Ordered lists (1. item) - keep number but style it
    result = result.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (_match, indent, num, text) =>
        `${indent}  ${chalk.white(`${num}.`)} ${text}`
    );

    // Clean up any remaining stray markdown characters that weren't part of patterns
    // Remove leftover backticks
    result = result.replace(/`/g, '');
    
    // Restore code blocks
    codeBlocks.forEach((block, i) => {
        result = result.replace(`<<<CODEBLOCK${i}>>>`, block);
    });

    // Clean up excessive blank lines
    result = result.replace(/\n{3,}/g, '\n\n');

    // Apply word wrapping to paragraphs (not code blocks)
    result = wrapParagraphs(result);

    return result.trim();
}

/**
 * Strip ANSI escape codes from a string to get actual length
 */
function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get the terminal width, with a fallback
 */
function getTerminalWidth(): number {
    return process.stdout.columns || 80;
}

/**
 * Wrap a single line of text to fit within the terminal width
 * Preserves ANSI escape codes properly
 */
function wrapLine(line: string, maxWidth: number): string {
    const stripped = stripAnsi(line);
    
    // If line fits, return as-is
    if (stripped.length <= maxWidth) {
        return line;
    }
    
    // Don't wrap lines that are part of code blocks (they have special formatting)
    if (line.includes('─') || line.trim().startsWith('  ') && !line.includes('•') && !line.includes('.')) {
        return line;
    }
    
    const words = line.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testLineStripped = stripAnsi(testLine);
        
        if (testLineStripped.length <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
            }
            currentLine = word;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines.join('\n');
}

/**
 * Wrap paragraphs in the text while preserving code blocks and special formatting
 */
function wrapParagraphs(text: string): string {
    const maxWidth = getTerminalWidth() - 4; // Leave some margin
    
    return text
        .split('\n')
        .map(line => wrapLine(line, maxWidth))
        .join('\n');
}
