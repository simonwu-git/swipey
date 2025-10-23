import { UploadPage } from '@/components/UploadPage'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Transaction Import
        </h1>
        <UploadPage />
      </div>
    </main>
  )
}