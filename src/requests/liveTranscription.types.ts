/** Messages the live-transcription websocket sends to the client. */
export type LiveServerMessage =
    | { type: 'ready'; models: string[] }
    | { type: 'chunk_received'; index: number }
    | { type: 'chunk_error'; index: number; message: string }
    | { type: 'chunk_skipped'; model: string; index: number }
    | {
          type: 'result'
          model: string
          index: number
          text: string
          computeTime: number
      }
    | { type: 'error'; model: string; index: number; message: string }
    | { type: 'fatal'; message: string }
