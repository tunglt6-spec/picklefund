import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '../types'

export interface RegisteredAccount {
  username: string
  password: string
  role: Role
  clubId: string
  email: string
  fullName: string
}

interface Store {
  accounts: RegisteredAccount[]
  addAccount: (acc: RegisteredAccount) => void
}

export const useRegisteredAccountsStore = create<Store>()(
  persist(
    (set) => ({
      accounts: [],
      addAccount: (acc) => set(s => ({ accounts: [...s.accounts, acc] })),
    }),
    { name: 'picklefund-registered-accounts' }
  )
)
