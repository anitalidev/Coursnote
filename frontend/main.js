import { Editor, Extension, generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

const TabExtension = Extension.create({
  name: 'tab',
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.insertContent('\t'),
    };
  },
});

window.TipTapEditor = Editor;
window.TipTapStarterKit = StarterKit;
window.TipTapTabExtension = TabExtension;
window.TipTapGenerateHTML = (doc) => generateHTML(doc, [StarterKit]);
window.dispatchEvent(new Event('tiptap-ready'));
