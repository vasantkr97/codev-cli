import chalk from "chalk";

/**
 * Simple but reliable markdown-to-terminal renderer
 * Converts markdown to styled terminal output
 */
export function renderMarkdownToTerminal(markdown: string): string {
    let result = markdown;

    // Process code blocks FIRST (to protect them from other transformations)
    const codeBlocks: string[] = [];
    // Match code blocks with optional language identifier - handle both \n and \r\n
    result = result.replace(/```(\w*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `CODEBLOCK${codeBlocks.length}`;
        const langLabel = lang ? chalk.dim(`  [${lang}]`) : "";
        const formattedCode = code
            .trim()
            .split(/\r?\n/) // Handle both \n and \r\n line endings
            .map((line: string) => chalk.cyan(`    ${line}`))
            .join("\n");
        const border = chalk.gray("─".repeat(50));
        codeBlocks.push(`\n${border}${langLabel}\n${formattedCode}\n${border}\n`);
        return placeholder;
    });

    // Headings (## Heading -> styled heading)
    result = result.replace(/^######\s+(.+)$/gm, (_, text) => chalk.green.bold(`      ${text}`));
    result = result.replace(/^#####\s+(.+)$/gm, (_, text) => chalk.green.bold(`    ${text}`));
    result = result.replace(/^####\s+(.+)$/gm, (_, text) => chalk.green.bold(`   ${text}`));
    result = result.replace(/^###\s+(.+)$/gm, (_, text) => chalk.green.bold(`  ${text}`));
    result = result.replace(/^##\s+(.+)$/gm, (_, text) => chalk.magenta.bold.underline(`\n${text}\n`));
    result = result.replace(/^#\s+(.+)$/gm, (_, text) => chalk.magenta.bold.underline(`\n${text}\n`));

    // Horizontal rules
    result = result.replace(/^[-*_]{3,}$/gm, chalk.gray("─".repeat(60)));

    // Inline code (`code`) - Process BEFORE bold/italic to avoid conflicts
    result = result.replace(/`([^`\n\r]+)`/g, (_, code) => chalk.yellow.bgBlackBright(` ${code} `));

    // Bold text (**text** or __text__)
    result = result.replace(/\*\*(.+?)\*\*/g, (_, text) => chalk.bold(text));
    result = result.replace(/__(.+?)__/g, (_, text) => chalk.bold(text));

    // Italic text (*text* or _text_)
    result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, (_, text) => chalk.italic(text));
    result = result.replace(/(?<!_)_([^_]+?)_(?!_)/g, (_, text) => chalk.italic(text));

    // Strikethrough (~~text~~)
    result = result.replace(/~~(.+?)~~/g, (_, text) => chalk.strikethrough.dim(text));

    // Links [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
        `${chalk.blue.underline(text)} ${chalk.dim(`(${url})`)}`
    );

    // Blockquotes (> text)
    result = result.replace(/^>\s+(.+)$/gm, (_, text) => chalk.gray.italic(`  │ ${text}`));

    // Unordered lists (- item or * item or + item)
    result = result.replace(/^(\s*)[-*+]\s+(.+)$/gm, (_, indent, text) =>
        `${indent}  ${chalk.cyan("•")} ${text}`
    );

    // Ordered lists (1. item)
    result = result.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (_, indent, num, text) =>
        `${indent}  ${chalk.cyan(`${num}.`)} ${text}`
    );

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
        result = result.replace(`CODEBLOCK${i}`, block);
    });

    // Clean up excessive blank lines
    result = result.replace(/\n{3,}/g, "\n\n");

    return result.trim();
}
