import JSZip from 'jszip';
import { Editor, Extension, Mark, generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';

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
  Image.configure({ inline: false, allowBase64: true }),
];

window.TipTapEditor = Editor;
window.TipTapStarterKit = StarterKit;
window.TipTapTabExtension = TabExtension;
window.TipTapAllExtensions = allExtensions;
window.TipTapGenerateHTML = (doc) => generateHTML(doc, allExtensions);
window.JSZip = JSZip;
window.dispatchEvent(new Event('tiptap-ready'));
