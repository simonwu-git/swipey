'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface CSVDropzoneProps {
  onFileUpload: (file: File) => void
  disabled?: boolean
}

export function CSVDropzone({ onFileUpload, disabled }: CSVDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0])
    }
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false,
    disabled
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-sm text-gray-600">
          {isDragActive ? (
            <p>Drop the CSV file here...</p>
          ) : (
            <div>
              <p className="font-medium">Drag and drop a CSV file here</p>
              <p className="text-gray-500">or click to select a file</p>
            </div>
          )}
        </div>
        {disabled && (
          <p className="text-sm text-gray-500">Please select an account first</p>
        )}
      </div>
    </div>
  )
}
