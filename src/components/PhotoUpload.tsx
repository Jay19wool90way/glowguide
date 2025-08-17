import React, { useRef, useState } from 'react';
import { Camera, Upload, X, CheckCircle, Image } from 'lucide-react';

interface PhotoUploadProps {
  onImageSelect: (imageData: string) => void;
  loading?: boolean;
  uploadedImage?: string | null;
}

export function PhotoUpload({ onImageSelect, loading = false, uploadedImage }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      onImageSelect(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearImage = () => {
    onImageSelect('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (uploadedImage && !loading) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <img 
              src={uploadedImage} 
              alt="Uploaded" 
              className="w-40 h-40 rounded-2xl object-cover shadow-md"
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 text-teal-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Photo ready for analysis!</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
        <div className="text-center">
          {uploadedImage && (
            <img 
              src={uploadedImage} 
              alt="Analyzing" 
              className="w-40 h-40 rounded-2xl object-cover mx-auto mb-4 shadow-md opacity-75"
            />
          )}
          <div className="flex items-center justify-center gap-2 text-teal-600 mb-4">
            <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full"></div>
            <span className="font-medium">Analyzing your wellness patterns...</span>
          </div>
          <p className="text-sm text-gray-500">This may take a few moments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
      <div 
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          dragActive 
            ? 'border-teal-400 bg-teal-50' 
            : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-r from-teal-100 to-pink-100 rounded-full flex items-center justify-center">
            {dragActive ? (
              <Image className="w-8 h-8 text-teal-600" />
            ) : (
              <Camera className="w-8 h-8 text-teal-600" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              {dragActive ? 'Drop your photo here' : 'Upload your photo for analysis'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              For best results, use natural lighting and face the camera directly
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <span>JPG, PNG, WebP</span>
              <span>•</span>
              <span>Max 5MB</span>
              <span>•</span>
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
}