import { createFileRoute } from '@tanstack/react-router'
import { GoodTextEditor } from '../../text_editor'


export const Route = createFileRoute('/')({
  component: App,
})



function App() {
  return (
    <div className="min-h-screen p-10 bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          GoodTextEditor Demo
        </h1>

        <GoodTextEditor
          initialHtml="<p>Hello world</p>"
          onChange={(html) => console.log('Editor Output:', html)}
        />
      </div>
    </div>
  )
}
