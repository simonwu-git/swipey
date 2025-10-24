'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive && 'border-primary bg-primary/5',
        !isDragActive && 'border-muted-foreground/25',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:border-muted-foreground/50'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <Upload className="h-12 w-12 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          {isDragActive ? (
            <p>Drop the CSV file here...</p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium text-foreground">Drag and drop a CSV file here</p>
              <p className="text-muted-foreground">or click to select a file</p>
            </div>
          )}
        </div>
        {disabled && (
          <p className="text-sm text-muted-foreground">Please select an account first</p>
        )}
      </div>
    </div>
  )
}
