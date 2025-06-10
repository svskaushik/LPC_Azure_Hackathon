'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowUp } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

function Spinner() {
  return (
    <div className="animate-spin rounded-full border-2 border-gray-400 border-r-transparent h-5 w-5" />
  );
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status, stop } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [grading, setGrading] = useState<{ grade: string; reasoning: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setGrading(null);
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Submit image to API
  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) return;
    setUploading(true);
    setError(null);
    setGrading(null);
    try {
      const formData = new FormData();
      formData.append('image', image);
      const res = await fetch('/api/potato-grade', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.result) {
        setGrading(data.result);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setError('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-900">
      {/* Potato Grading Section */}
      <div className="w-full max-w-2xl mx-auto p-4 mt-6 mb-8 border rounded-lg bg-gray-50 dark:bg-zinc-800">
        <h2 className="text-xl font-bold mb-2">Potato Grading (Azure OpenAI Vision POC)</h2>
        <form onSubmit={handleImageUpload} className="flex flex-col gap-4 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#1670ec] file:text-white hover:file:bg-[#125aa5]"
          />
          {preview && (
            <img src={preview} alt="Preview" className="max-h-48 rounded shadow" />
          )}
          <button
            type="submit"
            disabled={!image || uploading}
            className="px-4 py-2 rounded bg-[#1670ec] text-white font-semibold disabled:bg-gray-300"
          >
            {uploading ? 'Grading...' : 'Upload & Grade'}
          </button>
        </form>
        {grading && (
          <div className="mt-4 p-3 rounded bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100">
            <div className="font-bold">Grade: {grading.grade}</div>
            <div className="whitespace-pre-wrap">{grading.reasoning}</div>
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 rounded bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100">
            {error}
          </div>
        )}
      </div>
      {/* Chat messages container */}
      <div className="flex-1 w-full max-w-2xl mx-auto pb-36">
        <div className="flex flex-col space-y-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* User message bubble */}
              {message.role === 'user' ? (
                <div className="p-3 rounded-lg bg-[#1670ec] text-white whitespace-pre-wrap break-words text-sm md:text-base max-w-xs md:max-w-md lg:max-w-lg">
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return <div key={`${message.id}-${i}`}>{part.text}</div>;
                      default:
                        return null;
                    }
                  })}
                </div>
              ) : (
                // Assistant message bubble
                <div className="flex items-start gap-3 max-w-xs md:max-w-md lg:max-w-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#1670ec] flex items-center justify-center overflow-hidden">
                      <Image
                        src="/azure-ai-bot-avatar.avif"
                        alt="AI Assistant"
                        width={32}
                        height={32}
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm md:text-base">
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return <div key={`${message.id}-${i}`}>{part.text}</div>;
                        default:
                          return null;
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {(status === 'submitted' || status === 'streaming') && (
            <div className="flex items-start gap-3 max-w-xs md:max-w-md lg:max-w-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-white border border-[#1670ec] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/azure-ai-bot-avatar.avif"
                    alt="AI Assistant"
                    width={32}
                    height={32}
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
              <div className="flex items-center text-sm md:text-base gap-2">
                <Spinner />
                <button
                  className="border px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
                  type="button"
                  onClick={() => stop()}
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-6 bg-white dark:bg-zinc-900">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 shadow-lg p-3"
          >
            <div className="flex items-end gap-2">
              <TextareaAutosize
                minRows={1}
                maxRows={6}
                className="w-full py-2 px-3 bg-transparent focus:outline-none dark:text-white text-sm md:text-base resize-none"
                value={input}
                placeholder="Send a message..."
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) {
                      handleSubmit(e);
                    }
                  }
                }}
              />

              <button
                type="submit"
                disabled={!input.trim() || status === 'submitted' || status === 'streaming'}
                className={`rounded-full p-2 ${
                  input.trim() && status === 'ready'
                    ? 'bg-[#1670ec] text-white hover:bg-[#125aa5]'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {(status === 'submitted' || status === 'streaming') ? (
                  <Spinner />
                ) : (
                  <ArrowUp size={18} />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}