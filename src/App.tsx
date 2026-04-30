/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, BookOpen, Printer, Trash2, ChevronRight, Loader2, Plus, Download, RefreshCw, CheckCircle2, LogOut, LogIn, X } from 'lucide-react';
import { geminiService, AnalysisResult, Variation } from './services/geminiService';
import { pdfService } from './services/pdfService';
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';

// Types
interface ErrorRecord {
  id: string;
  originalText: string;
  knowledgePoint: string;
  variations: Variation[];
  createdAt: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scan' | 'book'>('scan');
  const [history, setHistory] = useState<ErrorRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // OCR/Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'errorRecords'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as ErrorRecord[];
      setHistory(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'errorRecords');
    });

    return () => unsubscribe();
  }, [user]);

  const saveToHistory = async () => {
    if (!analysisResult || !user) return;
    try {
      await addDoc(collection(db, 'errorRecords'), {
        userId: user.uid,
        originalText: analysisResult.originalText,
        knowledgePoint: analysisResult.knowledgePoint,
        variations: variations,
        createdAt: serverTimestamp()
      });
      alert('已保存记录！');
      setAnalysisResult(null);
      setVariations([]);
      setSelectedImage(null);
      setActiveTab('book');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'errorRecords');
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'errorRecords', id));
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `errorRecords/${id}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="space-y-2">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-200">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">错题宝</h1>
            <p className="text-slate-500">拍照识题 · 举一反三 · 打印复习</p>
          </div>
          
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              欢迎使用错题宝！请登录以同步您的错题本到云端。
            </p>
            <button 
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3.5 px-4 rounded-xl font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" className="w-5 h-5" alt="Google" />
              使用 Google 账号登录
            </button>
          </div>
          
          <p className="text-xs text-slate-400">
            您的数据将安全存储在云端，随时随地查看。
          </p>
        </motion.div>
      </div>
    );
  }

  const exportSelected = async () => {
    const selected = history.filter(r => selectedIds.includes(r.id));
    if (selected.length === 0) return;
    try {
      await pdfService.generatePracticeSheet(selected);
    } catch (err) {
      console.error(err);
      alert('导出失败');
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg font-sans text-natural-text pb-20 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-natural-border sticky top-0 z-10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-natural-primary rounded-xl flex items-center justify-center text-white font-serif italic text-xl shadow-lg shadow-natural-primary/20">A</div>
            <h1 className="text-xl font-semibold tracking-tight text-natural-text">
              错题宝 <span className="font-normal text-sm text-natural-muted ml-2 hidden sm:inline">Smart Study Assistant</span>
            </h1>
            <div className="h-6 w-px bg-natural-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full border border-natural-border" />
              <span className="text-xs font-medium text-natural-muted">{user.displayName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'book' && history.length > 0 && (
              <button 
                onClick={exportSelected}
                disabled={selectedIds.length === 0}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all shadow-sm ${selectedIds.length > 0 ? 'bg-natural-primary text-white hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">打印练习 ({selectedIds.length})</span>
                <span className="sm:hidden">{selectedIds.length}</span>
              </button>
            )}
            <button 
              onClick={() => logout()}
              className="p-2 text-natural-muted hover:text-natural-primary transition-colors hover:bg-natural-primary/5 rounded-full"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'scan' ? (
            <ScanView 
              key="scan"
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              analysisResult={analysisResult}
              setAnalysisResult={setAnalysisResult}
              variations={variations}
              setVariations={setVariations}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
              onSave={saveToHistory}
            />
          ) : (
            <BookView 
              key="book"
              history={history}
              onDelete={deleteRecord}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onExport={exportSelected}
            />
          )}
        </AnimatePresence>
      </main>


      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-natural-primary h-16 shadow-2xl flex justify-center items-center gap-12 z-20">
        <NavButton 
          active={activeTab === 'scan'} 
          onClick={() => setActiveTab('scan')} 
          icon={<Camera className="w-6 h-6" />}
          label="错题识别"
        />
        <div className="h-8 w-[1px] bg-white/10" />
        <NavButton 
          active={activeTab === 'book'} 
          onClick={() => setActiveTab('book')} 
          icon={<BookOpen className="w-6 h-6" />}
          label="错题本"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 transition-all font-medium ${active ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
    >
      <div className={`${active ? 'text-natural-accent' : ''}`}>
        {icon}
      </div>
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );
}

// Sub-components (to be developed in detail)
function CameraView({ onCapture, onClose }: { onCapture: (img: string) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, 
          audio: false 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        alert("无法访问相机，请检查权限设置。");
        onClose();
      }
    }
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUri = canvas.toDataURL('image/jpeg');
      onCapture(dataUri);
      stream?.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <span className="font-bold text-sm tracking-widest uppercase">扫描错题 / Camera</span>
        <div className="w-10" />
      </div>
      
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
          <div className="w-full max-w-sm aspect-[3/4] border-2 border-white/50 rounded-lg relative">
             <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -ml-1 -mt-1" />
             <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mr-1 -mt-1" />
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -ml-1 -mb-1" />
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mr-1 -mb-1" />
          </div>
        </div>
      </div>

      <div className="h-32 bg-black/80 flex items-center justify-center px-8">
        <button 
          onClick={capture}
          className="w-20 h-20 bg-white rounded-full border-8 border-white/20 active:scale-90 transition-transform shadow-2xl flex items-center justify-center group"
        >
          <div className="w-14 h-14 bg-white rounded-full border-2 border-black/10 group-hover:bg-slate-100" />
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function ScanView({ selectedImage, setSelectedImage, isAnalyzing, setIsAnalyzing, analysisResult, setAnalysisResult, variations, setVariations, isGenerating, setIsGenerating, onSave, key }: any) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [mimeType, setMimeType] = useState("image/jpeg");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setMimeType(type);
      startOCR(reader.result as string, type);
    };
    reader.readAsDataURL(file);
  };

  const startOCR = async (data: string, type: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setVariations([]);
    try {
      const res = await geminiService.analyzeError(data, type);
      setAnalysisResult(res);
    } catch (err) {
      console.error(err);
      alert('识别失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateVariations = async () => {
    if (!analysisResult) return;
    setIsGenerating(true);
    try {
      const res = await geminiService.generateVariations(analysisResult.originalText, analysisResult.knowledgePoint);
      setVariations(res);
    } catch (err) {
      console.error(err);
      alert('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto space-y-8 py-8"
    >
      {/* Upload Zone */}
      {!selectedImage && !isCameraOpen ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[250px]">
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border-2 border-dashed border-natural-border hover:border-natural-primary/50 hover:bg-white/50 transition-all cursor-pointer shadow-sm group"
          >
            <div className="w-16 h-16 rounded-2xl bg-natural-accent/10 text-natural-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-natural-text">拍摄错题</p>
              <p className="text-[10px] uppercase tracking-widest font-bold mt-1 opacity-60">Use Camera</p>
            </div>
          </button>

          <label className="flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border-2 border-dashed border-natural-border hover:border-natural-primary/50 hover:bg-white/50 transition-all cursor-pointer shadow-sm group">
            <div className="w-16 h-16 rounded-2xl bg-natural-bg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-natural-muted" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-natural-text">上传照片/PDF</p>
              <p className="text-[10px] uppercase tracking-widest font-bold mt-1 opacity-60">Upload Image/PDF</p>
            </div>
            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleImageUpload} />
          </label>
        </div>
      ) : selectedImage && !isCameraOpen ? (
        <div className="relative rounded-3xl overflow-hidden border border-natural-border shadow-lg">
          {mimeType === "application/pdf" ? (
            <div className="w-full aspect-video bg-natural-bg flex flex-col items-center justify-center gap-4">
               <BookOpen className="w-16 h-16 text-natural-primary opacity-40" />
               <p className="text-natural-muted font-bold text-sm tracking-widest uppercase">PDF 文件已就绪</p>
            </div>
          ) : (
            <img src={selectedImage} alt="Mistake" className="w-full h-auto object-contain bg-slate-100 max-h-[500px]" />
          )}
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-sm transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ) : null}

      {isCameraOpen && (
        <CameraView 
          onCapture={(img) => {
            setSelectedImage(img);
            setMimeType("image/jpeg");
            setIsCameraOpen(false);
            startOCR(img, "image/jpeg");
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Analysis Section */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center p-16 space-y-6">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-natural-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-natural-primary rounded-full animate-ping opacity-20" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-natural-text font-medium text-lg leading-relaxed">正在识别题目内容与知识点...</p>
            <p className="text-xs text-natural-muted uppercase tracking-widest mt-1">Analyzing Content</p>
          </div>
        </div>
      )}

      {analysisResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-natural-border space-y-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-natural-primary opacity-20" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-natural-accent" />
                 <h3 className="text-xs font-bold text-natural-accent uppercase tracking-widest">Original Question | 识别文字</h3>
              </div>
              <textarea 
                className="w-full p-4 rounded-xl bg-natural-bg/50 border border-natural-border focus:ring-2 focus:ring-natural-primary outline-none text-natural-text text-base leading-relaxed font-serif min-h-[150px] transition-all"
                value={analysisResult.originalText}
                onChange={(e) => setAnalysisResult({ ...analysisResult, originalText: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-natural-primary" />
                 <h3 className="text-xs font-bold text-natural-primary uppercase tracking-widest">Knowledge Point | 知识点</h3>
              </div>
              <input 
                className="w-full p-4 rounded-xl bg-natural-bg/50 border border-natural-border focus:ring-2 focus:ring-natural-primary outline-none text-natural-primary font-bold text-base transition-all"
                value={analysisResult.knowledgePoint}
                onChange={(e) => setAnalysisResult({ ...analysisResult, knowledgePoint: e.target.value })}
              />
            </div>
            
            {variations.length === 0 && !isGenerating && (
              <button 
                onClick={generateVariations}
                className="w-full py-4 bg-natural-primary text-white rounded-2xl font-bold shadow-xl shadow-natural-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-3 text-lg"
              >
                <RefreshCw className="w-6 h-6" />
                生成举一反三
              </button>
            )}
          </div>

          {isGenerating && (
            <div className="flex flex-col items-center justify-center p-16 space-y-6">
              <Loader2 className="w-12 h-12 text-natural-primary animate-spin" />
              <div className="text-center">
                <p className="text-natural-text font-medium text-lg leading-relaxed">正在为您生成 3 道高质量变式题...</p>
                <p className="text-xs text-natural-muted uppercase tracking-widest mt-1">Generating Variations</p>
              </div>
            </div>
          )}

          {variations.length > 0 && (
            <div className="space-y-8 pb-12">
              <div className="flex items-center justify-between border-b-2 border-dashed border-natural-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-natural-primary" />
                  <h3 className="text-lg font-bold text-natural-text tracking-tight">举一反三变式练习</h3>
                </div>
                <button 
                  onClick={generateVariations}
                  className="text-xs font-bold text-natural-primary flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  重新生成
                </button>
              </div>
              
              <div className="grid gap-8">
                {variations.map((v: Variation, idx: number) => (
                  <div key={idx} className="bg-white p-8 rounded-[2rem] border border-natural-border space-y-6 shadow-sm hover:shadow-md transition-all">
                    <span className="text-xs font-serif italic text-natural-muted block">Variant {idx+1} · 变式练习</span>
                    <p className="text-lg leading-relaxed text-natural-text font-serif">{v.question}</p>
                    
                    <div className="space-y-4 pt-6 border-t border-natural-border">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded font-bold uppercase shrink-0 mt-1">Answer</span>
                        <p className="text-natural-text font-medium">{v.answer}</p>
                      </div>
                      <div className="p-5 bg-natural-bg/50 rounded-2xl border border-natural-border/50">
                        <span className="text-[11px] font-bold text-natural-muted block mb-2 uppercase tracking-widest">易错点分析 · Analysis</span>
                        <p className="text-sm text-natural-primary leading-relaxed italic">
                          {v.analysis}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={onSave}
                className="w-full py-5 bg-natural-accent text-white rounded-2xl font-bold shadow-xl shadow-natural-accent/20 hover:opacity-95 transition-all flex items-center justify-center gap-3 text-lg mt-8"
              >
                <CheckCircle2 className="w-6 h-6" />
                保存错题至本
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function BookView({ history, onDelete, selectedIds, setSelectedIds, onExport }: { 
  history: ErrorRecord[], 
  onDelete: (id: string) => void, 
  selectedIds: string[], 
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>, 
  onExport: () => void,
  key?: string
}) {
  const [viewingRecord, setViewingRecord] = useState<ErrorRecord | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === history.length) setSelectedIds([]);
    else setSelectedIds(history.map(h => h.id));
  };

  if (viewingRecord) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto space-y-8 py-8 pb-20">
        <button 
          onClick={() => setViewingRecord(null)}
          className="flex items-center gap-2 text-natural-muted font-bold uppercase tracking-widest text-xs hover:text-natural-primary transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          返回列表 / Back to list
        </button>
        
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-natural-border space-y-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <BookOpen className="w-32 h-32 text-natural-primary" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-natural-accent animate-pulse" />
              <span className="text-xs font-bold text-natural-accent uppercase tracking-widest">Original Mistake | 原错题</span>
            </div>
            <p className="text-xl md:text-2xl font-serif text-natural-text leading-relaxed font-semibold">{viewingRecord.originalText}</p>
            <div className="p-4 bg-natural-bg rounded-xl border border-natural-border/50">
               <span className="text-[10px] font-bold text-natural-muted block mb-1 uppercase tracking-widest">Knowledge Point</span>
               <p className="text-sm font-bold text-natural-primary">{viewingRecord.knowledgePoint}</p>
            </div>
          </div>

          <div className="h-px border-b-2 border-dashed border-natural-border" />

          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-natural-primary" />
                <h3 className="text-xl font-bold text-natural-text tracking-tight uppercase">Variations | 举一反三练习</h3>
              </div>
            </div>

            <div className="grid gap-12">
              {viewingRecord.variations.map((v, i) => (
                <div key={i} className="space-y-6 relative">
                  <div className="p-6 bg-natural-bg/30 rounded-3xl border border-natural-border/40 group hover:border-natural-primary/30 transition-all">
                    <p className="text-lg text-natural-text font-serif leading-relaxed"><span className="text-natural-primary font-bold mr-3 italic">0{i+1}.</span>{v.question}</p>
                  </div>
                  <div className="px-6 space-y-4">
                    <div className="flex items-start gap-3">
                       <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded shadow-sm">Answer</span>
                       <p className="text-slate-700 font-medium">{v.answer}</p>
                    </div>
                    <div className="p-6 bg-natural-bg/50 rounded-2xl border border-natural-border/30 relative">
                       <span className="text-[10px] font-bold text-natural-muted block mb-2 uppercase tracking-widest">Analysis</span>
                       <p className="text-sm text-natural-primary leading-relaxed italic">{v.analysis}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-6 py-8"
    >
      {history.length > 0 && (
        <div className="flex items-center justify-between px-4 mb-4">
          <button 
            onClick={selectAll}
            className="text-xs font-bold text-natural-muted uppercase tracking-widest flex items-center gap-3 group"
          >
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.length === history.length ? 'bg-natural-primary border-natural-primary text-white' : 'border-natural-border bg-white group-hover:border-natural-primary/50'}`}>
              {selectedIds.length === history.length && <CheckCircle2 className="w-4 h-4" />}
            </div>
            全选 / Select All ({selectedIds.length}/{history.length})
          </button>
          
          {selectedIds.length > 0 && (
            <button 
              onClick={onExport}
              className="text-xs font-bold text-natural-accent flex items-center gap-2 hover:underline uppercase tracking-widest"
            >
              <Download className="w-4 h-4" />
              导出所选 / Export
            </button>
          )}
        </div>
      )}

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-32 text-natural-muted space-y-6 text-center">
          <div className="w-24 h-24 bg-natural-bg rounded-3xl flex items-center justify-center mb-2">
            <BookOpen className="w-12 h-12 opacity-30" />
          </div>
          <div>
            <p className="font-bold text-lg text-natural-text">错题本还是空的</p>
            <p className="text-sm opacity-60 uppercase tracking-widest mt-1">Workbook is empty</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {history.map((record) => (
            <div 
              key={record.id}
              className="group bg-white p-6 rounded-3xl border border-natural-border hover:border-natural-primary transition-all flex items-center gap-4 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
              onClick={() => setViewingRecord(record)}
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-natural-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <button 
                onClick={(e) => { e.stopPropagation(); toggleSelect(record.id); }}
                className={`w-8 h-8 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all ${selectedIds.includes(record.id) ? 'bg-natural-primary border-natural-primary text-white shadow-lg shadow-natural-primary/20' : 'border-natural-border bg-natural-bg/50'}`}
              >
                {selectedIds.includes(record.id) && <CheckCircle2 className="w-5 h-5" />}
              </button>
              
              <div className="flex-1 min-w-0 ml-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold text-natural-primary bg-natural-primary/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">{record.knowledgePoint}</span>
                  <span className="text-[10px] text-natural-muted font-bold uppercase tracking-widest">{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-natural-text text-base font-semibold truncate font-serif italic">{record.originalText}</p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                  className="p-2.5 text-natural-muted hover:text-natural-accent hover:bg-natural-accent/5 rounded-full transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <ChevronRight className="w-6 h-6 text-natural-border group-hover:text-natural-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

