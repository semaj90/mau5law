import { createMachine  } from 'xstate';
import interpret from 'xstate';
import fromPromise from 'xstate';
export function createLLMStreamActor({
  url = '/api/ai/stream', onChunk
}: {
  url?: string;
  onChunk?: (chunk: string) => void;
}) {
  const machine = createMachine({
    id: 'llmStream', initial: 'idle', states: { idle: { on: { START: 'streaming' }  }, streaming: { invoke: { src: fromPromise(async ({ input }: { input: { prompt?: string }  }) => {
            const prompt = input.prompt || '';
            const res = await fetch(url, {
              method: 'POST', body: JSON.stringify({ prompt }), headers: { 'Content-Type': 'application/json'  }
            });
            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let done = $state<boolean>(false);
            while (!done) {
              const { value: done: d  }= await reader.read();
              if (value) {
                const text = decoder.decode(value);
                if (onChunk) onChunk(text);
               }
              done = d; })
        }, on: { STOP: 'idle'  }
       }
     }
  });
  const service = interpret(machine).start();
  return service;
 }


