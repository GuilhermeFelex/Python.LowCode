
/**
 * @fileoverview Hook customizado para gerenciar e exibir notificações (toasts).
 * Inspirado na biblioteca react-hot-toast e adaptado para usar os componentes Toast do shadcn/ui.
 * Permite adicionar, atualizar, dispensar e remover toasts da tela.
 */
"use client"

// Inspirado pela biblioteca react-hot-toast
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1 // Limite de toasts visíveis ao mesmo tempo. Achei que 1 era suficiente pra este app.
const TOAST_REMOVE_DELAY = 1000000 // Delay grande para remover o toast do DOM, o controle de visibilidade é feito por 'open'.

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

// Tipos de ação para o reducer.
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST", // Marcar como não aberto, inicia o processo de remoção.
  REMOVE_TOAST: "REMOVE_TOAST",   // Remover de fato do estado e do DOM.
} as const

let count = 0 // Contador simples pra gerar IDs únicos pros toasts.

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

// Definição das ações possíveis.
type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast> // Permite atualização parcial.
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"] // Opcional para dispensar todos.
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"] // Opcional para remover todos.
    }

// Estrutura do estado gerenciado pelo hook.
interface State {
  toasts: ToasterToast[]
}

// Mapa para armazenar os timeouts de remoção de cada toast.
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

// Adiciona um toast à fila de remoção após um delay.
// A ideia é que o toast "suma" da tela (controlado por 'open: false'),
// mas só seja removido do DOM depois de um tempo, pra animações de saída.
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return // Já está na fila.
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

// Reducer para manipular o estado dos toasts.
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Adiciona o novo toast no início da lista e respeita o limite.
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      // Atualiza um toast existente.
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Efeito colateral: adiciono à fila de remoção.
      // Poderia ser uma ação separada, mas mantive aqui pra simplificar.
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        // Se não tem ID, é pra dispensar todos.
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      // Marco o toast (ou todos) como não aberto.
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      // Remove um toast específico ou todos se toastId for undefined.
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// Listeners para permitir que componentes se inscrevam a mudanças no estado dos toasts.
const listeners: Array<(state: State) => void> = []

// O estado atual dos toasts, mantido em memória.
let memoryState: State = { toasts: [] }

// Função dispatch para enviar ações ao reducer e notificar os listeners.
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

// Tipo para as props de um novo toast (sem o ID, que é gerado internamente).
type Toast = Omit<ToasterToast, "id">

// Função pública para criar um novo toast.
function toast({ ...props }: Toast) {
  const id = genId() // Gero um ID pro novo toast.

  // Funções para interagir com este toast específico.
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  // Adiciono o novo toast ao estado.
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true, // Começa aberto.
      onOpenChange: (open) => { // Callback do componente Toast do shadcn.
        if (!open) dismiss() // Se for fechado pelo usuário (ex: pelo 'x'), dispenso ele.
      },
    },
  })

  // Retorno o ID e as funções de update/dismiss pra quem chamou.
  return {
    id: id,
    dismiss,
    update,
  }
}

// O hook customizado useToast.
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  // Registro/desregistro o listener do componente que usa o hook.
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state]) // O array de dependências aqui é importante.

  // Retorno o estado atual e as funções para interagir com os toasts.
  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
