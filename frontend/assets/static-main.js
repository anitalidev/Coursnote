import JSZip from 'https://esm.sh/jszip@3.10.1';
import { Editor, Extension, Mark, generateHTML } from 'https://esm.sh/@tiptap/core@3.27.1';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@3.27.1';
import { TextStyle, Color } from 'https://esm.sh/@tiptap/extension-text-style@3.27.1';
import Highlight from 'https://esm.sh/@tiptap/extension-highlight@3.27.1';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@3.27.1';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@3.27.1';

const TabExtension = Extension.create({
  name: 'tab',
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.insertContent('\t'),
    };
  },
});

const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return { size: { default: null, parseHTML: el => el.style.fontSize?.replace('px','') || null, renderHTML: attrs => attrs.size ? { style: `font-size:${attrs.size}px` } : {} } };
  },
  parseHTML() { return [{ tag: 'span', getAttrs: el => el.style.fontSize ? { size: el.style.fontSize.replace('px','') } : false }]; },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0]; },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) => chain().setMark('fontSize', { size }).run(),
      unsetFontSize: () => ({ chain }) => chain().unsetMark('fontSize').run(),
    };
  },
});

const allExtensions = [
  StarterKit,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TabExtension,
  FontSize,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder: ({ editor }) => editor.options.element.getAttribute('data-placeholder') || '' }),
];

window.TipTapEditor = Editor;
window.TipTapStarterKit = StarterKit;
window.TipTapTabExtension = TabExtension;
window.TipTapAllExtensions = allExtensions;
window.TipTapGenerateHTML = (doc) => generateHTML(doc, allExtensions);
window.JSZip = JSZip;
window.dispatchEvent(new Event('tiptap-ready'));
