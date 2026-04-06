'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Minus,
} from 'lucide-react'
import { useCallback, useEffect } from 'react'

const MenuButton = ({ onClick, isActive, disabled, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded transition-colors ${
      isActive
        ? 'bg-violet-600 text-white'
        : 'text-gray-400 hover:bg-gray-600 hover:text-white'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
)

const MenuBar = ({ editor }) => {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-600 bg-gray-750">
      {/* Undo/Redo */}
      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="元に戻す"
      >
        <Undo className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="やり直し"
      >
        <Redo className="w-4 h-4" />
      </MenuButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Headings */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="見出し1"
      >
        <Heading1 className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="見出し2"
      >
        <Heading2 className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="見出し3"
      >
        <Heading3 className="w-4 h-4" />
      </MenuButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Text formatting */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="太字"
      >
        <Bold className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="斜体"
      >
        <Italic className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="下線"
      >
        <UnderlineIcon className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="取り消し線"
      >
        <Strikethrough className="w-4 h-4" />
      </MenuButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Lists */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="箇条書き"
      >
        <List className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="番号付きリスト"
      >
        <ListOrdered className="w-4 h-4" />
      </MenuButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Link */}
      <MenuButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        title="リンク"
      >
        <LinkIcon className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive('link')}
        title="リンク解除"
      >
        <Unlink className="w-4 h-4" />
      </MenuButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Horizontal rule */}
      <MenuButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="区切り線"
      >
        <Minus className="w-4 h-4" />
      </MenuButton>
    </div>
  )
}

export default function RichTextEditor({ content, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-violet-400 underline hover:text-violet-300',
        },
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[400px] p-4 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // 外部からcontentが変更された場合に反映
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <style jsx global>{`
        .ProseMirror {
          min-height: 400px;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 1em 0 0.5em;
          color: white;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1em 0 0.5em;
          color: white;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 1em 0 0.5em;
          color: white;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror li {
          margin: 0.25em 0;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #4b5563;
          margin: 1.5em 0;
        }
        .ProseMirror a {
          color: #a78bfa;
          text-decoration: underline;
        }
        .ProseMirror a:hover {
          color: #c4b5fd;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #6b7280;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
