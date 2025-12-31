declare module "marked-terminal" {
    import { MarkedExtension } from "marked";
    import { ChalkInstance } from "chalk";

    interface TerminalRendererOptions {
        /** Syntax highlighting theme for code blocks */
        code?: ChalkInstance | ((code: string, lang?: string) => string);
        /** Styling for blockquotes */
        blockquote?: ChalkInstance;
        /** Styling for regular headings */
        heading?: ChalkInstance;
        /** Styling for the first heading */
        firstHeading?: ChalkInstance;
        /** Styling for horizontal rules */
        hr?: ChalkInstance;
        /** Styling for list items */
        listitem?: ChalkInstance;
        /** Styling for lists */
        list?: ChalkInstance;
        /** Styling for paragraphs */
        paragraph?: ChalkInstance;
        /** Styling for strong/bold text */
        strong?: ChalkInstance;
        /** Styling for emphasis/italic text */
        em?: ChalkInstance;
        /** Styling for inline code */
        codespan?: ChalkInstance;
        /** Styling for deleted/strikethrough text */
        del?: ChalkInstance;
        /** Styling for link text */
        link?: ChalkInstance;
        /** Styling for href URLs */
        href?: ChalkInstance;
        /** Tab size for code blocks */
        tab?: number;
        /** Enable emoji support */
        emoji?: boolean;
        /** Enable Unicode output */
        unescape?: boolean;
        /** Terminal width for word wrapping */
        width?: number;
        /** Show section prefix for headings */
        showSectionPrefix?: boolean;
        /** Indent for lists */
        listIndent?: string;
        /** Prefix for list items */
        listItemPrefix?: string;
        /** Prefix for ordered list items */
        orderedListPrefix?: boolean | string;
        /** Enable reflowing of text */
        reflowText?: boolean;
    }

    /**
     * Creates a marked extension for terminal rendering
     */
    export function markedTerminal(
        options?: TerminalRendererOptions
    ): MarkedExtension;
}
