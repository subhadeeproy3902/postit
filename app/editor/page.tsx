import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

const content = `
# Hello World

This is a simple editor with **bold** and _italic_ text. This is a simple editor with **bold** and _italic_ text. This is a simple editor with **bold** and _italic_ text. This is a simple editor with **bold** and _italic_ text. 

**Underline** __III__
`

export default function Editor() {
  return (
    <SimpleEditor content={content} />
  )
}