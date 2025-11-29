
import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { t } from '../utils/i18n';
import { Language } from '../types';

interface ImageEditorProps {
    onBack: () => void;
    lang?: Language;
}

export default function ImageEditor({ onBack, lang = 'en' }: ImageEditorProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>('image/png');
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMimeType(file.type);
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setSelectedImage(result);
                setEditedImage(null); // Reset edit on new upload
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEdit = async () => {
        if (!selectedImage || !prompt) return;

        setIsProcessing(true);
        try {
            const base64Data = selectedImage.split(',')[1];
            const result = await editImage(base64Data, mimeType, prompt);
            if (result) {
                setEditedImage(result);
            } else {
                alert("No image generated. Please try a different prompt.");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to edit image. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (editedImage) {
            const link = document.createElement('a');
            link.href = editedImage;
            link.download = 'crontal-edited-image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-200 bg-white sticky top-0 z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center">
                        <div className="w-3 h-3 bg-brandOrange rounded-sm rotate-45"></div>
                    </div>
                    <span className="font-bold text-lg">Crontal <span className="text-slate-400 font-normal">| AI Image Editor</span></span>
                </div>
                <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-slate-900">
                    Back to Home
                </button>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">Visual Spec Editor</h1>
                    <p className="text-slate-500">Upload technical drawings or site photos and modify them using AI.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Input Side */}
                    <div className="space-y-6">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full h-96 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${selectedImage ? 'border-slate-300 bg-slate-100' : 'border-brandOrange/30 bg-orange-50 hover:bg-orange-100/50'}`}
                        >
                            {selectedImage ? (
                                <img src={selectedImage} alt="Original" className="w-full h-full object-contain p-4" />
                            ) : (
                                <div className="text-center p-6">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-brandOrange">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <p className="font-bold text-slate-700">Upload Image</p>
                                    <p className="text-xs text-slate-500 mt-1">JPG, PNG supported</p>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Edit Prompt</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={prompt} 
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g. Highlight the flange in red, Remove the background..." 
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                                />
                                <button 
                                    onClick={handleEdit}
                                    disabled={!selectedImage || !prompt || isProcessing}
                                    className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Processing
                                        </>
                                    ) : (
                                        'Generate'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Output Side */}
                    <div className="space-y-6">
                        <div className="w-full h-96 bg-slate-900 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-800 shadow-xl">
                            {editedImage ? (
                                <img src={editedImage} alt="Edited" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center text-slate-600 p-6">
                                    <div className="w-16 h-16 border-2 border-slate-700 border-dashed rounded-xl mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    </div>
                                    <p>AI generated image will appear here</p>
                                </div>
                            )}
                        </div>

                        {editedImage && (
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 text-sm font-bold text-brandOrange hover:text-orange-700 transition"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Download Result
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
