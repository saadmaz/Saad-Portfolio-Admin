import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { PromptBlock } from '../../PromptBlock';
import { Figure, Gallery, MediaText } from './nodes/media';
import { Callout, Column, Columns, Divider, HtmlBlock, PullQuote, SourcesBlock, TocBlock } from './nodes/blocks';
import { Chart, Embed } from './nodes/embed-chart';
import { Attachment, Comparison, Resources, Step, Steps } from './nodes/dev-blocks';

const lowlight = createLowlight(common);

/** Code blocks with per-block display options, stored as data-* on the <pre>. */
const CodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      wrap: {
        default: false,
        parseHTML: (el: HTMLElement) => el.hasAttribute('data-wrap'),
        renderHTML: (attrs: Record<string, unknown>) => (attrs.wrap ? { 'data-wrap': '' } : {}),
      },
      lineNumbers: {
        default: false,
        parseHTML: (el: HTMLElement) => el.hasAttribute('data-line-numbers'),
        renderHTML: (attrs: Record<string, unknown>) => (attrs.lineNumbers ? { 'data-line-numbers': '' } : {}),
      },
    };
  },
});

/** Languages offered in the code-block picker (all are in lowlight's `common` set). */
export const CODE_LANGUAGES = [
  'plaintext', 'bash', 'css', 'diff', 'go', 'java', 'javascript', 'json', 'kotlin', 'markdown',
  'php', 'python', 'ruby', 'rust', 'sql', 'swift', 'typescript', 'xml', 'yaml',
] as const;

/**
 * Every editor extension. Output stays plain semantic HTML with data-*
 * markers (see the site's CmsContent), and the editor's JSON document is
 * stored alongside it as the structured source of truth.
 */
export function editorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      codeBlock: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: null },
      },
    }),
    CodeBlock.configure({ lowlight, defaultLanguage: 'plaintext' }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TableKit.configure({ table: { resizable: false } }),
    PromptBlock,
    Figure,
    Gallery,
    MediaText,
    Callout,
    PullQuote,
    Column,
    Columns,
    Divider,
    TocBlock,
    SourcesBlock,
    HtmlBlock,
    Embed,
    Chart,
    Steps,
    Step,
    Comparison,
    Resources,
    Attachment,
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === 'prompt'
          ? 'Write or paste the prompt readers can copy…'
          : node.type.name === 'heading'
            ? 'Heading'
            : 'Write, or use Insert to add images, callouts, embeds and more…',
    }),
  ];
}
