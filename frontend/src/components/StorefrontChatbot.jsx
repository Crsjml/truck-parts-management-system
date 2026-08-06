import React, { useState, useEffect, useRef } from 'react';
import { ChatCircleDots, X, Package, CheckCircle, Warning, WarningCircle, ShieldCheck, Broom, ArrowRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from './ui/Drawer';
import { ThreadPrimitive, MessagePrimitive, ComposerPrimitive, AssistantRuntimeProvider, useLocalRuntime, makeAssistantToolUI } from '@assistant-ui/react';
import { apiPost } from '../api/apiClient';
import { supabase } from '../supabaseClient';

const mockPart = {
  id: 'MOCK-1',
  name: 'FleetGuard Air Filter Premium',
  sku: 'FG-AF-1200',
  price: 85.50,
  stock: 0,
  minStock: 5,
  category: 'Filters',
  oem: 'OEM-1234'
};

export default function StorefrontChatbot({ onOpenPartDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [chatId, setChatId] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    
    checkMobile();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className={`flex h-14 items-center justify-center rounded-full glass-panel glass-panel-hover text-foreground active:scale-95 transition-all duration-300 overflow-hidden ${isScrolled ? 'w-14' : 'w-48 px-4 gap-2'}`}
        >
          <ChatCircleDots weight="fill" className="w-7 h-7 shrink-0 text-accent" />
          <span className={`font-bold whitespace-nowrap transition-all duration-300 ${isScrolled ? 'opacity-0 w-0' : 'opacity-100'}`}>
            Parts Assistant
          </span>
        </button>
      </div>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialFocusRef={inputRef}
        panelClassName={`fixed flex flex-col font-sans bg-card-white dark:bg-transparent glass-panel ${isMobile ? 'bottom-0 left-0 right-0 h-[85vh] rounded-t-3xl' : 'right-0 top-0 h-full w-[400px]'}`}
        panelVariants={{
          initial: { opacity: 0, x: isMobile ? 0 : 400, y: isMobile ? "100%" : 0 },
          animate: { opacity: 1, x: 0, y: 0 },
          exit: { opacity: 0, x: isMobile ? 0 : 400, y: isMobile ? "100%" : 0 }
        }}
      >
        <ChatbotContent 
          key={chatId} 
          onOpenPartDetail={onOpenPartDetail} 
          onClose={() => setIsOpen(false)} 
          onClear={() => setChatId(c => c + 1)}
          inputRef={inputRef}
        />
      </Drawer>
    </>
  );
}

function ChatbotContent({ onOpenPartDetail, onClose, onClear, inputRef }) {
  const runtime = useLocalRuntime({
    onNew: async (msg) => {
      let userText = "";
      if (Array.isArray(msg.content)) {
        userText = msg.content.filter(c => c.type === 'text').map(c => c.text).join(' ');
      } else if (typeof msg.content === 'string') {
        userText = msg.content;
      }
      
      try {
        const { data, ok } = await apiPost('/api/chat/simulate', {
          body: { messages: [{ role: 'user', content: userText }] },
          supabase
        });
        
        if (ok && data && data.content) {
          return {
            role: 'assistant',
            content: data.content
          };
        }
        return {
          content: [{ type: 'text', text: "Hmm, I didn't get a valid response from the server." }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: "Network error occurred." }]
        };
      }
    }
  });

  return (
    <div className="flex flex-col h-full flex-1 w-full">
        <div className="flex items-center justify-between border-b border-border p-4 bg-secondary shrink-0">
          <div>
            <h2 className="text-lg font-display font-bold">Parts Assistant</h2>
            <p className="text-xs text-muted-foreground">Ask for OEM numbers or stock</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onClear} className="p-2 hover:bg-background rounded-full transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="New Chat" title="New Chat">
              <Broom weight="bold" className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Close Chat" title="Close">
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-background flex flex-col relative">
          <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitive.Root className="flex flex-col h-full">
               <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4 flex flex-col">
                  <ThreadPrimitive.Empty>
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 border border-border shadow-sm">
                        <Package weight="duotone" className="w-8 h-8 text-foreground" />
                      </div>
                      <h3 className="text-xl font-display font-bold">How can I help?</h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">I can cross-reference OEM numbers, check live stock, or suggest alternative parts.</p>
                      
                      <div className="flex flex-col gap-3 mt-8 w-full max-w-[300px]">
                         <ThreadPrimitive.Suggestion prompt="Find alternative for OEM-1234" className="w-full flex items-center justify-between text-left text-sm bg-secondary/50 border border-border px-4 py-3 rounded-xl hover:bg-secondary hover:border-accent/30 transition-colors shadow-sm font-medium group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                            <span className="truncate pr-2">Find alternative for OEM-1234</span>
                            <ArrowRight weight="bold" className="w-4 h-4 text-muted-foreground group-hover:text-accent shrink-0 transition-colors" />
                         </ThreadPrimitive.Suggestion>
                         <ThreadPrimitive.Suggestion prompt="Do you have FleetGuard air filters?" className="w-full flex items-center justify-between text-left text-sm bg-secondary/50 border border-border px-4 py-3 rounded-xl hover:bg-secondary hover:border-accent/30 transition-colors shadow-sm font-medium group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                            <span className="truncate pr-2">Do you have FleetGuard air filters?</span>
                            <ArrowRight weight="bold" className="w-4 h-4 text-muted-foreground group-hover:text-accent shrink-0 transition-colors" />
                         </ThreadPrimitive.Suggestion>
                         <ThreadPrimitive.Suggestion prompt="What's the price of a brake drum?" className="w-full flex items-center justify-between text-left text-sm bg-secondary/50 border border-border px-4 py-3 rounded-xl hover:bg-secondary hover:border-accent/30 transition-colors shadow-sm font-medium group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                            <span className="truncate pr-2">What's the price of a brake drum?</span>
                            <ArrowRight weight="bold" className="w-4 h-4 text-muted-foreground group-hover:text-accent shrink-0 transition-colors" />
                         </ThreadPrimitive.Suggestion>
                      </div>
                    </div>
                  </ThreadPrimitive.Empty>
                  <ThreadPrimitive.Messages components={{ Message: MyMessage }} />
               </ThreadPrimitive.Viewport>
               
               <div className="p-4 border-t border-border bg-background shrink-0">
                 <ComposerPrimitive.Root className="flex items-end gap-2 bg-secondary border border-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-accent focus-within:border-accent transition-all">
                   <ComposerPrimitive.Input 
                     ref={inputRef}
                     placeholder="Ask for a part or OEM number..."
                     className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm max-h-[120px] p-2 resize-none"
                     rows={1}
                   />
                   <ComposerPrimitive.Send className="bg-foreground text-background w-9 h-9 rounded-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-192,64a16,16,0,0,0-2.42,29.84l85.62,40.55,40.55,85.62A15.86,15.86,0,0,0,157.74,256q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l64-192A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-35.46-74.9L160,119.31a8,8,0,0,0-11.31-11.31L109.05,145.64l-74.9-35.46L216.92,49.08Z"></path></svg>
                   </ComposerPrimitive.Send>
                 </ComposerPrimitive.Root>
               </div>
            </ThreadPrimitive.Root>
            {/* The tool UI for rendering the mini part card */}
            <MiniPartCardTool onOpenPartDetail={onOpenPartDetail} />
          </AssistantRuntimeProvider>
        </div>
    </div>
  );
}

const MyMessage = () => {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-2 mb-4">
      <MessagePrimitive.If user>
        <div className="bg-accent text-accent-foreground p-3 rounded-2xl rounded-tr-sm max-w-[85%] self-end shadow-sm empty:hidden">
           <MessagePrimitive.Content />
        </div>
      </MessagePrimitive.If>
      <MessagePrimitive.If assistant>
        <div className="bg-secondary text-secondary-foreground p-3 rounded-2xl rounded-tl-sm max-w-[85%] self-start shadow-sm border border-border empty:hidden">
           <MessagePrimitive.Content />
        </div>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
};

const MiniPartCardTool = makeAssistantToolUI({
  toolName: "show_part",
  render: ({ args, status, onOpenPartDetail }) => {
    const part = args?.part;
    
    if (!part) {
      return (
        <div className="my-3 flex items-center gap-3 p-4 rounded-2xl border border-border bg-secondary/50">
          <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Looking up part details...</span>
        </div>
      );
    }

    // Evaluate stock status
    const availableStock = part.stock || 0;
    let stockStatus = 'In Stock';
    let StockIcon = CheckCircle;
    let stockColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    
    if (availableStock === 0) {
      stockStatus = 'Out of Stock';
      StockIcon = WarningCircle;
      stockColor = 'text-alarm-red bg-alarm-red/10 border-alarm-red/20';
    } else if (availableStock <= part.minStock) {
      stockStatus = 'Low Stock';
      StockIcon = Warning;
      stockColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }

    return (
      <div className="my-3 flex flex-col gap-2">
        <div 
          onClick={() => {
             // In a real scenario, we'd trigger onOpenPartDetail(part)
             // But since we are mocking, we just emit a console log or mock click
             if (onOpenPartDetail) onOpenPartDetail(part);
          }}
          className="group relative flex flex-col gap-3 rounded-2xl p-4 transition-all cursor-pointer glass-panel glass-panel-hover"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border border-border">
              <Package weight="duotone" className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold leading-tight">{part.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">SKU: {part.sku} • OEM: {part.oem}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${stockColor}`}>
              <StockIcon weight="fill" className="h-3 w-3" />
              {stockStatus}
            </div>
            <span className="font-display font-bold text-base">${part.price.toFixed(2)}</span>
          </div>
        </div>
        
        {/* If the tool is fully completed and it was out of stock, we render the Request Logged badge */}
        {status.type === 'complete' && stockStatus === 'Out of Stock' && (
          <div className="self-end mt-1 inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-600 shadow-sm">
            <ShieldCheck weight="fill" className="h-4 w-4" />
            Request Logged
          </div>
        )}
      </div>
    );
  }
});
