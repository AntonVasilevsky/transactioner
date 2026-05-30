import { useState } from 'react'
import { Plus, Star, Trash2, Save, Loader2, AlertTriangle, X } from 'lucide-react'

const AVAILABLE_ROOMS = ['RedStar', 'Champion Poker', 'Nexa']

type AccountFormField = 'roomName' | 'roomUsername' | 'roomPlayerId' | 'email'
type ContactFormField = 'contactMethod' | 'contactValue'
type AccountForm = Record<AccountFormField, string>
type ContactForm = {
  contactMethod: ContactMethod
  contactValue: string
  isPrimary?: boolean
}

interface Props {
  playerData: PlayerPayload
  onSuccess: (p: PlayerPayload) => void
  onDeleted: () => void
}

export default function EditPlayerView({ playerData, onSuccess, onDeleted }: Props) {
  const { player } = playerData
  const [contacts, setContacts] = useState<ContactForm[]>(
    () => {
      const initialContacts = (playerData.player.contacts || playerData.contacts || [{ contact_method: player.contact_method || 'TG', contact_value: player.messenger_username || '', is_primary: 1 }]).map((contact) => ({
        contactMethod: contact.contactMethod || contact.contact_method || 'TG',
        contactValue: contact.contactValue || contact.contact_value || '',
        isPrimary: Boolean(contact.isPrimary || contact.is_primary)
      }))
      if (initialContacts.length > 0 && !initialContacts.some(contact => contact.isPrimary)) {
        initialContacts[0].isPrimary = true
      }
      return initialContacts
    }
  )
  const [defaultWallet, setDefaultWallet] = useState(player.default_wallet || '')
  const [defaultWalletNetwork, setDefaultWalletNetwork] = useState(player.default_wallet_network || '')
  const [accounts, setAccounts] = useState<AccountForm[]>(
    playerData.accounts.map(a => ({
      roomName: a.roomName ?? a.room_name ?? '',
      roomUsername: a.roomUsername ?? a.room_username ?? '',
      roomPlayerId: a.roomPlayerId ?? a.room_player_id ?? '',
      email: a.email || ''
    }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleAddAccount = () => {
    setAccounts([...accounts, { roomName: AVAILABLE_ROOMS[0], roomUsername: '', roomPlayerId: '', email: '' }])
  }

  const handleUpdateAccount = (index: number, field: AccountFormField, value: string) => {
    const updated = [...accounts]
    updated[index][field] = value
    setAccounts(updated)
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

    if (normalizedContacts.length === 0) { setError('Добавьте хотя бы один контакт'); return }
    if (accounts.length === 0) { setError('Добавьте хотя бы один аккаунт'); return }
    if (!player.id) { setError('Не найден ID игрока'); return }

    setLoading(true)
    setError('')
    try {
      const res = await window.electronAPI.savePlayer({
        id: player.id,
        messenger_username: primaryContact.contactValue,
        contact_method: primaryContact.contactMethod,
        contacts: normalizedContacts,
        default_wallet: defaultWallet.trim(),
        default_wallet_network: defaultWalletNetwork.trim(),
        accounts
      })
      if (res.success) {
        onSuccess({
          player: {
            ...player,
            messenger_username: primaryContact.contactValue,
            contact_method: primaryContact.contactMethod,
            default_wallet: defaultWallet.trim(),
            default_wallet_network: defaultWalletNetwork.trim(),
            contacts: normalizedContacts.map((contact) => ({
              contact_method: contact.contactMethod,
              contact_value: contact.contactValue,
              is_primary: contact.isPrimary ? 1 : 0
            }))
          },
          accounts,
          contacts: normalizedContacts.map((contact) => ({
            contact_method: contact.contactMethod,
            contact_value: contact.contactValue,
            is_primary: contact.isPrimary ? 1 : 0
          }))
        })
      } else {
        setError(res.error || 'Ошибка сохранения')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!player.id) {
      setError('Не найден ID игрока для удаления')
      return
    }
    setDeleting(true)
    try {
      const res = await window.electronAPI.deletePlayer(player.id)
      if (res.success) {
        onDeleted()
      } else {
        setError(res.error || 'Ошибка удаления')
        setShowDeleteConfirm(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
    }
  }

  const primaryContact = contacts.find(contact => contact.contactValue.trim()) || contacts[0] || { contactMethod: 'TG', contactValue: '' }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 relative">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="text-red-400" size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-100">Удалить игрока?</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              Будет удалён <span className="text-slate-200 font-medium">{primaryContact.contactMethod}: {primaryContact.contactValue}</span> вместе со всеми аккаунтами. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /> Удалить</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-1 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Редактировать игрока
          </h2>
          <p className="text-slate-400 text-sm">ID: {player.id}</p>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-colors border border-red-500/20"
        >
          <Trash2 size={16} /> Удалить игрока
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-400">Контакты игрока</label>
            <button type="button" onClick={handleAddContact}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-400/10 px-3 py-2 rounded-lg transition-colors">
              <Plus size={16} /> Добавить контакт
            </button>
          </div>
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={contact.contactMethod}
                  onChange={e => handleUpdateContact(index, 'contactMethod', e.target.value)}
                  className="w-1/4 bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:border-violet-500 transition-all"
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
                  onChange={e => handleUpdateContact(index, 'contactValue', e.target.value)}
                  placeholder={contact.isPrimary ? 'Основной контакт' : 'Дополнительный контакт'}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-700 outline-none focus:border-violet-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleSetPrimaryContact(index)}
                  className={`px-3 rounded-xl border transition-colors ${
                    contact.isPrimary
                      ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                      : 'border-slate-700 text-slate-500 hover:text-violet-300'
                  }`}
                  title="Использовать в шаблоне по умолчанию"
                >
                  <Star size={18} fill={contact.isPrimary ? 'currentColor' : 'none'} />
                </button>
                <button type="button" onClick={() => handleRemoveContact(index)} disabled={contacts.length === 1}
                  className="px-3 rounded-xl border border-slate-700 text-slate-500 hover:text-red-400 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>
            ))}
            <p className="text-xs text-slate-500">Отмеченный контакт используется в шаблонах по умолчанию.</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl">
          <label className="block text-sm font-medium text-slate-400 mb-2">Кошелек по умолчанию для вывода</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={defaultWalletNetwork}
              onChange={e => setDefaultWalletNetwork(e.target.value)}
              placeholder="USDT TRC20"
              className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-700 outline-none focus:border-violet-500 transition-all"
            />
            <input
              type="text"
              value={defaultWallet}
              onChange={e => setDefaultWallet(e.target.value)}
              placeholder="T..."
              className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-700 outline-none focus:border-violet-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-200">Аккаунты в румах</h3>
            <button type="button" onClick={handleAddAccount}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-400/10 px-4 py-2 rounded-lg transition-colors">
              <Plus size={16} /> Добавить рум
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center p-8 bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl text-slate-500">
              Нет привязанных румов.
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((acc, index) => (
                <div key={index} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative">
                  <button type="button" onClick={() => handleRemoveAccount(index)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-colors">
                    <X size={18} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Покер-рум</label>
                      <select value={acc.roomName} onChange={e => handleUpdateAccount(index, 'roomName', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-violet-500">
                        {AVAILABLE_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Юзернейм в руме</label>
                      <input type="text" value={acc.roomUsername} onChange={e => handleUpdateAccount(index, 'roomUsername', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Player ID (для Nexa)</label>
                      <input type="text" value={acc.roomPlayerId} onChange={e => handleUpdateAccount(index, 'roomPlayerId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                      <input type="text" value={acc.email} onChange={e => handleUpdateAccount(index, 'email', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-violet-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <button type="submit" disabled={loading || !contacts.some(contact => contact.contactValue.trim())}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Сохранить изменения</>}
        </button>
      </form>
    </div>
  )
}
