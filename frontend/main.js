import JSZip from 'jszip';
import { Editor, Extension, Mark, generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') || null,
        renderHTML: attrs => attrs.width ? { width: attrs.width, style: `width:${attrs.width}` } : {},
      },
    };
  },
  addNodeView() {
    return ({ node, updateAttributes }) => {
      const wrapper = document.createElement('span');
      wrapper.style.cssText = 'display:inline-block;position:relative;max-width:100%';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      if (node.attrs.width) img.style.width = node.attrs.width;
      img.style.cssText += ';max-width:100%;display:block';

      const handle = document.createElement('span');
      handle.style.cssText = 'position:absolute;bottom:3px;right:3px;width:10px;height:10px;background:#4f8ef7;border-radius:2px;cursor:se-resize;opacity:0.85';
      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = img.offsetWidth;
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:se-resize';
        document.body.appendChild(overlay);
        const onMove = e => { img.style.width = Math.max(40, startW + e.clientX - startX) + 'px'; };
        const onUp = () => {
          updateAttributes({ width: img.style.width });
          overlay.remove();
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      wrapper.appendChild(img);
      wrapper.appendChild(handle);
      return {
        dom: wrapper,
        stopEvent: (e) => handle.contains(e.target),
      };
    };
  },
});

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
  ResizableImage.configure({ inline: false, allowBase64: true }),
];

window.TipTapEditor = Editor;
window.TipTapStarterKit = StarterKit;
window.TipTapTabExtension = TabExtension;
window.TipTapAllExtensions = allExtensions;
window.TipTapGenerateHTML = (doc) => generateHTML(doc, allExtensions);
window.JSZip = JSZip;
window.dispatchEvent(new Event('tiptap-ready'));
