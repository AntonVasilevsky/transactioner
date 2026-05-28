import { useState } from 'react'
import { Plus, Star, Trash2, Save, Loader2 } from 'lucide-react'

const AVAILABLE_ROOMS = ['RedStar', 'Champion Poker', 'Nexa']

type AccountFormField = 'roomName' | 'roomUsername' | 'roomPlayerId' | 'email'
type ContactFormField = 'contactMethod' | 'contactValue'
type AccountForm = Record<AccountFormField, string>
type ContactForm = {
  contactMethod: ContactMethod
  contactValue: string
  isPrimary?: boolean
}

export default function AddPlayerView({ onSuccess }: { onSuccess: (player: PlayerPayload) => void }) {
  const [contacts, setContacts] = useState<ContactForm[]>([{ contactMethod: 'TG', contactValue: '', isPrimary: true }])
  const [defaultWallet, setDefaultWallet] = useState('')
  const [defaultWalletNetwork, setDefaultWalletNetwork] = useState('')
  const [accounts, setAccounts] = useState<AccountForm[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddAccount = () => {
    setAccounts([...accounts, { roomName: AVAILABLE_ROOMS[0], roomUsername: '', roomPlayerId: '', email: '' }])
  }

  const handleUpdateAccount = (index: number, field: AccountFormField, value: string) => {
    const newAccounts = [...accounts]
    newAccounts[index][field] = value
    setAccounts(newAccounts)
  }

  const handleRemoveAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index))
  }

  const handleAddContact = () => {
    setContacts([...contacts, { contactMethod: 'TG', contactValue: '' }])
  }

  const handleUpdateContact = (index: number, field: ContactFormField, value: string) => {
    const updated = [...contacts]
    if (field === 'contactMethod') {
      updated[index].contactMethod = value as ContactMethod
    } else {
      updated[index].contactValue = value
    }
    setContacts(updated)
  }

  const handleRemoveContact = (index: number) => {
    if (contacts.length === 1) return
    const updated = contacts.filter((_, i) => i !== index)
    if (!updated.some(contact => contact.isPrimary)) {
      updated[0].isPrimary = true
    }
    setContacts(updated)
  }

  const handleSetPrimaryContact = (index: number) => {
    setContacts(contacts.map((contact, i) => ({ ...contact, isPrimary: i === index })))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedContacts = contacts
      .map((contact) => ({ ...contact, contactValue: contact.contactValue.trim() }))
      .filter(contact => contact.contactValue)
    if (normalizedContacts.length > 0 && !normalizedContacts.some(contact => contact.isPrimary)) {
      normalizedContacts[0].isPrimary = true
    }
    const primaryContact = normalizedContacts.find(contact => contact.isPrimary) || normalizedContacts[0]

    if (normalizedContacts.length === 0) {
      setError('Добавьте хотя бы один контакт игрока')
      return
    }
    if (accounts.length === 0) {
      setError('Добавьте хотя бы один аккаунт в руме')
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = {
        messenger_username: primaryContact.contactValue,
        contact_method: primaryContact.contactMethod,
        contacts: normalizedContacts,
        default_wallet: defaultWallet.trim(),
        default_wallet_network: defaultWalletNetwork.trim(),
        accounts
      }
      const res = await window.electronAPI.savePlayer(data)
      if (res.success) {
        onSuccess({
          player: {
            id: res.id,
            messenger_username: primaryContact.contactValue,
            contact_method: primaryContact.contactMethod,
            default_wallet: defaultWallet.trim(),
            default_wallet_network: defaultWalletNetwork.trim()
          },
          accounts,
          contacts: normalizedContacts.map((contact) => ({
            contact_method: contact.contactMethod,
            contact_value: contact.contactValue,
            is_primary: contact.isPrimary ? 1 : 0
          }))
        })
      } else {
        setError(res.error || 'Ошибка при сохранении')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          Добавить игрока
        </h2>
        <p className="text-slate-400">Внесите данные о новом игроке и его аккаунтах в румах.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-400">Контакты игрока</label>
            <button
              type="button"
              onClick={handleAddContact}
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> Добавить контакт
            </button>
          </div>
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={contact.contactMethod}
                  onChange={(e) => handleUpdateContact(index, 'contactMethod', e.target.value)}
                  className="w-1/4 bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                >
                  <option value="TG">TG</option>
                  <option value="WA">WA</option>
                  <option value="Discord">Discord</option>
                  <option value="Teams">Teams</option>
                  <option value="Email">Email</option>
                </select>
                <input
                  type="text"
                  value={contact.contactValue}
                  onChange={(e) => handleUpdateContact(index, 'contactValue', e.target.value)}
                  placeholder={contact.isPrimary ? '@player_tg или номер телефона' : 'Дополнительный контакт'}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleSetPrimaryContact(index)}
                  className={`px-3 rounded-xl border transition-colors ${
                    contact.isPrimary
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 text-slate-500 hover:text-emerald-300'
                  }`}
                  title="Использовать в шаблоне по умолчанию"
                >
                  <Star size={18} fill={contact.isPrimary ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveContact(index)}
                  disabled={contacts.length === 1}
                  className="px-3 rounded-xl border border-slate-700 text-slate-500 hover:text-red-400 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors"
                  title="Удалить контакт"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <p className="text-xs text-slate-500">Отмеченный контакт используется в шаблонах по умолчанию.</p>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl">
          <label className="block text-sm font-medium text-slate-400 mb-2">Кошелек по умолчанию для вывода</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={defaultWalletNetwork}
              onChange={(e) => setDefaultWalletNetwork(e.target.value)}
              placeholder="USDT TRC20"
              className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <input
              type="text"
              value={defaultWallet}
              onChange={(e) => setDefaultWallet(e.target.value)}
              placeholder="T..."
              className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Accounts list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-200">Аккаунты в румах</h3>
            <button
              type="button"
              onClick={handleAddAccount}
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> Добавить рум
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center p-8 bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl text-slate-500">
              Нет привязанных румов. Нажмите "Добавить рум".
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((acc, index) => (
                <div key={index} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative group">
                  <button
                    type="button"
                    onClick={() => handleRemoveAccount(index)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Покер-рум</label>
                      <select
                        value={acc.roomName}
                        onChange={(e) => handleUpdateAccount(index, 'roomName', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                      >
                        {AVAILABLE_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Юзернейм в руме</label>
                      <input
                        type="text"
                        value={acc.roomUsername}
                        onChange={(e) => handleUpdateAccount(index, 'roomUsername', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Player ID (для Nexa)</label>
                      <input
                        type="text"
                        value={acc.roomPlayerId}
                        onChange={(e) => handleUpdateAccount(index, 'roomPlayerId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Email (для Champion/Nexa)</label>
                      <input
                        type="text"
                        value={acc.email}
                        onChange={(e) => handleUpdateAccount(index, 'email', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !contacts.some(contact => contact.contactValue.trim())}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Сохранить и перейти к заявке</>}
        </button>
      </form>
    </div>
  )
}
