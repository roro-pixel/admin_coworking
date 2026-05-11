import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { Bold, Italic, List, ListOrdered, Strikethrough, Code } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Commencez à écrire...',
  minHeight = '120px'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      BulletList,
      OrderedList,
      ListItem,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[${minHeight}] p-3`,
        'data-placeholder': placeholder,
      },
    },
  });

  if (!editor) {
    return null;
  }

  const ToolbarButton: React.FC<{
    onClick: () => void;
    active: boolean;
    icon: React.ElementType;
    title: string;
  }> = ({ onClick, active, icon: Icon, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 ${active ? 'bg-gray-200 text-primary-600' : 'text-gray-600'}`}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={Bold}
          title="Gras"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={Italic}
          title="Italique"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          icon={Strikethrough}
          title="Barré"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          icon={Code}
          title="Code"
        />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={List}
          title="Liste à puces"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={ListOrdered}
          title="Liste numérotée"
        />
      </div>
      <EditorContent editor={editor} className="min-h-[100px]" />
    </div>
  );
};