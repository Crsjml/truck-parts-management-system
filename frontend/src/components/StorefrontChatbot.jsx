import React, { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react';
import { ChatCircleDots, X, Package, CheckCircle, Warning, WarningCircle, Broom, ArrowRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from './ui/Drawer';
import { useSettings } from '../context/SettingsContext';
import { ThreadPrimitive, MessagePrimitive, ComposerPrimitive, AssistantRuntimeProvider, useLocalRuntime, makeAssistantToolUI, useAuiState, MessagePartPrimitive } from '@assistant-ui/react';
import { apiPost, apiStream } from '../api/apiClient';
import { supabase } from '../supabaseClient';
import { loadThread, saveThread, clearThread } from '../utils/chatThreadStorage';
import { localizePriceText, showPartParts } from '../utils/chatPriceText';
import { toChatMessages, contentFromResponse, networkErrorContent, CHAT_TIMEOUT_MS, readNdjson, foldStreamEvent, initialStreamState, contentFromStreamState, STREAM_INTERRUPTED } from '../utils/chatTransport';

const PartDetailContext = createContext(null);

const isNdjson = (res) => res.ok && /ndjson/i.test(res.headers?.get?.('content-type') ?? '');

// Fallback / non-stream path: the JSON endpoint, one shot.
async function* runJson(chatMessages, abortSignal) {
  try {
    const res = await apiPost('/api/chat', { messages: chatMessages }, { supabase, timeoutMs: CHAT_TIMEOUT_MS });
    yield { content: contentFromResponse(res) };
  } catch {
    if (!abortSignal?.aborted) yield { content: networkErrorContent() };
  }
}

// Streams /api/chat/stream, yielding the accumulated content after every event.
// Falls back to POST /api/chat once if the stream fails before any token arrives.
// Aborting (close drawer / New Chat) cancels fetch; the generator's finally-chain
// in readNdjson then releases the reader.
const chatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const chatMessages = toChatMessages(messages);
    if (chatMessages.length === 0) {
      yield { content: contentFromResponse() };
      return;
    }
    let state = initialStreamState();
    let gotContent = false;
    try {
      const res = await apiStream('/api/chat/stream', { messages: chatMessages }, { supabase, signal: abortSignal });
      if (res.status === 429) {
        // Rate limited: the JSON fallback would be limited too; show the friendly text.
        const data = await res.json().catch(() => null);
        yield { content: contentFromResponse({ ok: false, status: 429, data }) };
        return;
      }
      if (!isNdjson(res)) throw new Error(`stream unavailable (${res.status})`);
      for await (const event of readNdjson(res)) {
        state = foldStreamEvent(state, event);
        if (state.text || state.parts.length > 0) {
          gotContent = true;
          yield { content: contentFromStreamState(state) };
        }
        if (state.finished) break;
      }
      if (!state.finished) throw new Error('stream ended early');
      if (!gotContent) yield { content: contentFromResponse() };
    } catch {
      if (abortSignal?.aborted) return;
      if (!gotContent) {
        yield* runJson(chatMessages, abortSignal);
        return;
      }
      yield { content: contentFromStreamState({ ...state, text: `${state.text}\n\n${STREAM_INTERRUPTED}` }) };
    }
  }
};

// "Thinking..." stays until the first token / card of the reply arrives.
function ThinkingIndicator() {
  const hasReply = useAuiState((s) => {
    const last = s.thread.messages.at(-1);
    return last?.role === 'assistant' && last.content.some((p) => (p.type === 'text' && p.text) || p.type === 'tool-call');
  });
  if (hasReply) return null;
  return (
    <div role="status" className="flex items-center gap-2 self-start text-xs text-muted-foreground mb-4">
      <span className="h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" aria-hidden="true" />
      Thinking... the first reply can take a little while.
    </div>
  );
}

// Saves finished messages after every thread change (in-flight replies are filtered out by saveThread;
// an empty thread removes the entry). Renders nothing; must sit inside AssistantRuntimeProvider.
function ThreadPersistence({ runtime, userId }) {
  useEffect(() => {
    if (!userId) return undefined;
    const thread = runtime.thread;
    return thread.subscribe(() => {
      const { messages, isRunning } = thread.getState();
      if (!isRunning) saveThread(userId, messages);
    });
  }, [runtime, userId]);
  return null;
}

// Keyed by user so a different signed-in user never inherits another user's runtime/thread.
export default function StorefrontChatbot({ onOpenPartDetail, userId }) {
  return <StorefrontChatbotInner key={userId ?? 'anon'} onOpenPartDetail={onOpenPartDetail} userId={userId} />;
}

function StorefrontChatbotInner({ onOpenPartDetail, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef(null);
  // The runtime lives here (always mounted on the storefront), not in the drawer body that unmounts on close.
  const [initialMessages] = useState(() => loadThread(userId));
  const runtime = useLocalRuntime(chatModelAdapter, { initialMessages });

  const handleNewChat = useCallback(() => {
    runtime.thread.cancelRun();
    runtime.thread.reset();
    clearThread(userId);
  }, [runtime, userId]);

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
    // The provider mounts the thread runtime, so it must stay mounted while the drawer opens and closes.
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPersistence runtime={runtime} userId={userId} />
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
          onOpenPartDetail={onOpenPartDetail} 
          onClose={() => setIsOpen(false)} 
          onClear={handleNewChat}
          inputRef={inputRef}
        />
      </Drawer>
    </AssistantRuntimeProvider>
  );
}

function ChatbotContent({ onOpenPartDetail, onClose, onClear, inputRef }) {
  return (
    <div className="flex flex-col h-full flex-1 w-full">
        <div className="flex items-center justify-between border-b border-border p-4 bg-secondary shrink-0">
          <div>
            <h2 className="text-lg font-display font-bold">Parts Assistant</h2>
            <p className="text-xs text-muted-foreground">Find parts, check stock, or ask how to order</p>
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
          <>
            <PartDetailContext.Provider value={onOpenPartDetail}>
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
                  <ThreadPrimitive.If running>
                    <ThinkingIndicator />
                  </ThreadPrimitive.If>
               </ThreadPrimitive.Viewport>
               
               <div className="p-4 border-t border-border bg-background shrink-0">
                 <ComposerPrimitive.Root className="flex items-end gap-2 bg-secondary border border-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-accent focus-within:border-accent transition-all">
                   <ComposerPrimitive.Input 
                     ref={inputRef}
                     placeholder="Ask for a part or OEM number..."
                     className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm max-h-[120px] p-2 resize-none"
                     rows={1}
                   />
                   <ComposerPrimitive.Send aria-label="Send message" className="bg-foreground text-background w-9 h-9 rounded-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-192,64a16,16,0,0,0-2.42,29.84l85.62,40.55,40.55,85.62A15.86,15.86,0,0,0,157.74,256q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l64-192A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-35.46-74.9L160,119.31a8,8,0,0,0-11.31-11.31L109.05,145.64l-74.9-35.46L216.92,49.08Z"></path></svg>
                   </ComposerPrimitive.Send>
                 </ComposerPrimitive.Root>
               </div>
            </ThreadPrimitive.Root>
            {/* The tool UI for rendering the mini part card */}
            <MiniPartCardTool />
            </PartDetailContext.Provider>
          </>
        </div>
    </div>
  );
}

// Assistant text part: same markup as the library default (pre-line paragraph + in-progress dot), but the
// backend's base-currency price strings are rewritten to the display currency so text and cards agree.
function PriceAwareText() {
  const { formatBaseCurrency, settings, displayCurrency } = useSettings();
  const baseCurrency = settings?.base_currency || 'PHP';
  const content = useAuiState((s) => s.message.content);
  const text = useAuiState((s) => (s.part.type === 'text' ? s.part.text : ''));
  const localized = useMemo(
    () => localizePriceText(text, showPartParts(content), formatBaseCurrency, { baseCurrency, displayCurrency }),
    [text, content, formatBaseCurrency, baseCurrency, displayCurrency]
  );
  return (
    <p style={{ whiteSpace: 'pre-line' }}>
      {localized}
      <MessagePartPrimitive.InProgress>
        <span style={{ fontFamily: 'revert' }}> ●</span>
      </MessagePartPrimitive.InProgress>
    </p>
  );
}

const assistantComponents = { Text: PriceAwareText };

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
           <MessagePrimitive.Content components={assistantComponents} />
        </div>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
};

function stockInfo(part) {
  if (part.stockStatus === 'out_of_stock' || (!part.stockStatus && !(Number(part.stock) > 0))) return { label: 'Out of Stock', Icon: WarningCircle, color: 'text-alarm-red bg-alarm-red/10 border-alarm-red/20' };
  if (part.stockStatus === 'low_stock') return { label: 'Low Stock', Icon: Warning, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  return { label: 'In Stock', Icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
}

function PartCard({ part }) {
  const onOpenPartDetail = useContext(PartDetailContext);
  const { label, Icon, color } = stockInfo(part);
  // part.price is already the selling price (markup applied server-side): convert only, never re-apply markup.
  const { formatBaseCurrency } = useSettings();
  const price = Number(part.price);
  return (
    <button
      type="button"
      aria-label={`View details: ${part.name}`}
      onClick={() => onOpenPartDetail?.(part)}
      className="group my-3 flex w-full flex-col gap-3 rounded-2xl p-4 text-left transition-all glass-panel glass-panel-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background border border-border">
          {part.image ? (
            <img src={part.image} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Package weight="duotone" className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold leading-tight">{part.name}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            SKU: {part.sku}{part.oem ? ` • OEM: ${part.oem}` : ''}
          </span>
          {part.category && <span className="block text-xs text-muted-foreground">{part.category}</span>}
        </span>
      </span>
      <span className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${color}`}>
          <Icon weight="fill" className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        <span className="font-display font-bold text-base">{Number.isFinite(price) ? formatBaseCurrency(price) : ''}</span>
      </span>
    </button>
  );
}

const MiniPartCardTool = makeAssistantToolUI({
  toolName: 'show_part',
  render: ({ args }) => (args?.part ? <PartCard part={args.part} /> : null)
});
