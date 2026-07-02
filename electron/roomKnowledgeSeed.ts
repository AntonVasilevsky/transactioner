export type RoomDealType = 'General' | 'Direct' | 'Agent'
export type RoomLanguage = 'RU' | 'EN' | 'ES'
export type RoomOperationType = 'Deposit' | 'Withdrawal'
export type RoomCountryStatus = 'Available' | 'Unavailable' | 'Check'

export interface RoomProfileSeed {
  roomKey: string
  displayName: string
  networkName?: string
  isActive?: boolean
  notes?: string
}

export interface RoomDealSeed {
  roomKey: string
  dealType?: RoomDealType
  language: RoomLanguage
  shortText: string
  fullText: string
  registrationUrl?: string
  promoCode?: string
  registrationNote?: string
  sortOrder?: number
  isActive?: boolean
  updatedAt?: string
}

export interface RoomPaymentMethodSeed {
  roomKey: string
  dealType?: RoomDealType
  operationType: RoomOperationType
  methodName: string
  currency?: string
  network?: string
  feeText?: string
  limitsText?: string
  note?: string
  sortOrder?: number
  isActive?: boolean
}

export interface RoomWalletSeed {
  roomKey: string
  dealType?: RoomDealType
  currency: string
  network: string
  walletAddress: string
  memoTag?: string
  feeText?: string
  note?: string
  verifiedAt?: string
  isActive?: boolean
  sortOrder?: number
}

export interface RoomCountryAvailabilitySeed {
  roomKey: string
  countryCode: string
  countryName: string
  status: RoomCountryStatus
  dealType?: RoomDealType
  language?: RoomLanguage
  note?: string
  sourceDate?: string
  sortOrder?: number
  isActive?: boolean
}

export interface RoomKnowledgeSeed {
  profiles: RoomProfileSeed[]
  deals: RoomDealSeed[]
  paymentMethods: RoomPaymentMethodSeed[]
  wallets: RoomWalletSeed[]
  countries: RoomCountryAvailabilitySeed[]
}

export const roomKnowledgeSeed: RoomKnowledgeSeed = {
  profiles: [
    {
      roomKey: 'champion-poker',
      displayName: 'Champion Poker',
      networkName: 'iPoker',
      notes: 'Champion has separate Direct and Agent deal variants.'
    },
    {
      roomKey: 'nexa',
      displayName: 'Nexa',
      notes: 'Agent deal for WPT Global players under agent cashier. Transactions are done through us via p2p.'
    },
    {
      roomKey: 'redstar',
      displayName: 'RedStar',
      networkName: 'iPoker',
      notes: 'Direct and Agent deal variants share the same current template.'
    }
  ],
  countries: [],
  deals: [
    {
      roomKey: 'champion-poker',
      dealType: 'Direct',
      language: 'RU',
      shortText: 'В Champion от нас доплата 25% net revenue + VIP Spade = 30% рейкбека со старта + майнинг + iPoker Tools + фирменный лейаут WPD.',
      fullText: [
        'Полные условия нашей сделки и ссылка на Champion Poker:',
        '- Бонуса на первый депозит сейчас в руме нет;',
        '- Ежедневные гонки с выплатами до €300 для игроков в Twister;',
        '- Рейк-чейз гонка, которая дает до 16,7% рейкбека;',
        '- Нашим игрокам присваивается VIP-уровень Spade (30% рейкбека);',
        '- Доплата от нас: 25% net revenue ежемесячно.',
        'В Champion, помимо бонусов и акций, при расчёте net revenue (не с игрока) вычитаются 12% от суммы рейка (т.н. marketing fee).',
        '',
        'Также от нас бесплатно: свежий майнинг NLH 20-5к, iPoker Tools и фирменный лейаут WPD.',
        'Перед регистрацией нужно почистить cookies или использовать чистый браузер.',
        'Переходим по ссылке (для игроков из доступных стран / для самостоятельных депозитов и выводов (полная верификация)):',
        'https://online.championpoker.com/promoRedirect?key=ej0xMzU1NTMyMyZsPTEzNTI0MzE2JnA9NzQzMw%3D%3D',
        '',
        'Зарегистрируйте аккаунт, используя свои данные.',
        'Пришлите ваш логин и почту для подтверждения регистрации через наш аффилейт.',
        'А также кошелек для доплат: USDT, USDC, Skrill.',
      ].join('\n'),
      registrationUrl: 'https://online.championpoker.com/promoRedirect?key=ej0xMzU1NTMyMyZsPTEzNTI0MzE2JnA9NzQzMw%3D%3D',
      registrationNote: 'Direct cashier / allowed countries.',
      sortOrder: 10,
      updatedAt: '2026-05-31'
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Direct',
      language: 'EN',
      shortText: 'Champion: 25% net revenue extra rakeback + VIP Spade status = 30% rakeback from the start + hand histories + iPoker Tools + WPD layout.',
      fullText: [
        'We offer a 25% net revenue extra rakeback + VIP Spade status = 30% rakeback from the start + hand histories + iPoker tools + branded WPD layout + help with deposits/withdrawals in Champion Poker.',
        '',
        'Full conditions of our deal and a link for Champion Poker:',
        '- Our extra rakeback is 25% of net revenue every month (i.e. of pure profit of the poker room after deducting all the poker room “expenses” on a player).',
        '- Our players are granted Spade VIP-level (30% rakeback);',
        '- There is no first deposit bonus at the moment;',
        '- Rake-chase which gives up to 16.7% rakeback.',
        '',
        'Our players also get free:',
        '- Fresh NLH 20-5k hand histories;',
        '- iPoker Tools;',
        '- WPD branded layout.',
        '',
        'They deduct 12% from the rake sum besides bonuses and promos when net revenue is calculated In Champion Poker. It is a so-called “marketing fee” (not directly from a player).',
        '',
        'Before registering you have to delete cookies or use a “clean” browser (any that is not usually used).',
        'Follow the link (for the direct cashier/allowed countries):',
        'https://online.championpoker.com/promoRedirect?key=ej0xMzU1NTMyMyZsPTEzNTI0MzE2JnA9NzQzMw%3D%3D',
        '',
        'Register using your data.',
        'After successful registration send us your login and email to check the tracking and deal status.',
        'Also we need your wallet for extra rakeback: USDT, USDC, Skrill.',
      ].join('\n'),
      registrationUrl: 'https://online.championpoker.com/promoRedirect?key=ej0xMzU1NTMyMyZsPTEzNTI0MzE2JnA9NzQzMw%3D%3D',
      registrationNote: 'Direct cashier / allowed countries.',
      sortOrder: 15,
      updatedAt: '2026-05-31'
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      language: 'RU',
      shortText: 'Champion Agent: 25% net revenue + VIP Spade 30% со старта + майнинг + iPoker Tools + WPD layout. Депозиты и выводы только через нас.',
      fullText: [
        'Полные условия нашей агентской сделки Champion Poker:',
        '- VIP-уровень Spade (30% рейкбека) со старта;',
        '- Доплата от нас: 25% net revenue ежемесячно;',
        '- Бонуса на первый депозит сейчас нет;',
        '- Ежедневные гонки до €300 для Twister;',
        '- Рейк-чейз до 16,7% рейкбека.',
        '',
        'Для игры из недоступных стран нужно использовать VPN при регистрации и постоянно для игры.',
        'Регистрация: VPN Норвегия или Венгрия, реальные ID/email, адрес в стране VPN.',
        'Перед регистрацией обязательно нужно почистить cookies или использовать чистый браузер (т.е. тот, который обычно не используется).',
        'Переходим по ссылке (для игроков из недоступных стран / для выводов через нас) https://online.championpoker.com/promoRedirect?key=ej0xMzUyNjA3MyZsPTEzNTI0MzE2JnA9Mzg0OA%3D%3D',
        '',
        'Зарегистрируйте аккаунт, используя свои данные.',
        'Пришлите ваш логин и почту для подтверждения регистрации через наш аффилейт.',
        'Также нам нужен ваш кошелек для доплат: USDT, USDC, Skrill.',
        '',
        'Случайный адрес в Норвегии можно сгенерировать на сайте www.bestrandoms.com/random-address-in-no.',
        'Депозиты и выводы только через нас.',
        'Доступные методы: депозит BTC / TRC20 / ERC20 / Skrill без комиссии; вывод BTC / TRC20 / ERC20 без комиссии, Skrill 1%.',
      ].join('\n'),
      registrationUrl: 'https://online.championpoker.com/promoRedirect?key=ej0xMzUyNjA3MyZsPTEzNTI0MzE2JnA9Mzg0OA%3D%3D',
      registrationNote: 'Agent cashier / VPN deal.',
      sortOrder: 20,
      updatedAt: '2026-05-31'
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      language: 'EN',
      shortText: 'Champion Agent: 25% net revenue extra rakeback + VIP Spade 30% from the start + hand histories + iPoker Tools + WPD layout.',
      fullText: [
        'Full conditions of our Champion Poker Agent deal:',
        '- VIP Spade level from the start (30% rakeback);',
        '- 25% net revenue extra rakeback from us every month;',
        '- No first deposit bonus at the moment;',
        '- Daily Twister races with up to €300 prizes;',
        '- Rake chase with up to 16.7% rakeback.',
        '',
        'If the player is from a restricted country, VPN with killswitch is required for registration and play.',
        'Before registering you have to delete cookies or use a “clean” browser (any that is not usually used).',
        'Follow the link (for the Agent Cashier/VPN deal):',
        'https://online.championpoker.com/promoRedirect?key=ej0xMzUyNjA3MyZsPTEzNTI0MzE2JnA9Mzg0OA%3D%3D',
        '',
        'Register using your data.',
        'After successful registration send us your login and email to check the tracking and deal status.',
        'Also we need your wallet for extra rakeback: USDT, USDC, Skrill.',
        '',
        'Use https://www.bestrandoms.com/random-address-in-no to generate a random address in Norway.',
        'Deposits and withdrawals are done through us only.',
        'Available methods: deposit BTC / TRC20 / ERC20 / Skrill with no fee; withdrawal BTC / TRC20 / ERC20 with no fee, Skrill 1%.',
      ].join('\n'),
      registrationUrl: 'https://online.championpoker.com/promoRedirect?key=ej0xMzUyNjA3MyZsPTEzNTI0MzE2JnA9Mzg0OA%3D%3D',
      registrationNote: 'Agent cashier / VPN deal.',
      sortOrder: 30,
      updatedAt: '2026-05-31'
    },
    {
      roomKey: 'redstar',
      dealType: 'General',
      language: 'RU',
      shortText: 'RedStar: VIP-статус Star = 35% рейкбека + 5% reload-бонус + майнинг + iPoker Tools.',
      fullText: [
        'Полные условия нашей сделки и ссылка на Redstar:',
        '- Бонус на первый депозит, 200% до 2000$ (даст 10% рб чистыми);',
        '- Еженедельные гонки с призовым фондом €12,500 для игроков в Twister.',
        '',
        '- Нашим игрокам присваивается VIP-уровень Star со старта (35% рейкбека). Очки рейкбека начинают сгорать через 60 дней, рекомендуем обменивать их раз в месяц, не позже 30 числа, после игровой сессии;',
        '- Ежемесячный reload-бонус дает 5% рейкбека (макс 300$ на 60 дней, отбивается частями по 1 евро за 200 очков);',
        '- Игрокам с 3к+ рейка в месяц доступен 10% reload-бонус;',
        '- Помощь с депозитом и выводом, чтобы избежать комиссии в руме.',
        '',
        'Также от нас бесплатно:',
        '- Свежий майнинг NLH 50-5к;',
        '- iPoker Tools;',
        '- Фирменный лейаут WPD.',
        '',
        'Перед регистрацией обязательно нужно почистить cookies или использовать чистый браузер.',
        'Переходим по ссылке:',
        'https://c.rsppartners.com/clickthrgh?btag=a_8499b_28l_9',
        'В поле "Регистрационный код" введите WPDEALS',
        '',
        'По завершении регистрации нам нужен логин, чтобы проверить привязку и активность сделки.',
      ].join('\n'),
      registrationUrl: 'https://c.rsppartners.com/clickthrgh?btag=a_8499b_28l_9',
      promoCode: 'WPDEALS',
      sortOrder: 40,
      updatedAt: '2026-05-31'
    },
    {
      roomKey: 'redstar',
      dealType: 'General',
      language: 'EN',
      shortText: 'RedStar: Star VIP status = 35% rakeback + 5% reload bonus + hand histories + iPoker Tools.',
      fullText: [
        'Full conditions of our deal and a link for Redstar:',
        '- Our players are granted Star VIP-level from the start (35% rakeback by granting points to exchange). The points start to expire after 60 days, so make sure to exchange them regularly. We recommend doing the exchange once a month, no later than the 30th, after your playing session;',
        '',
        '- First deposit bonus 200% up to $2000 (gives 10% pure rakeback);',
        '- Weekly races with €12,500 prize pool for spin’n’go players (called Twister in iPoker).',
        '',
        '- Monthly reload bonus up to $300, playthrough period: 60 days, released as 1 euro per 200 points (gives 5% rakeback);',
        '- 10% reload bonus for players with 3k+ rake per month;',
        '- Help with deposit and withdrawal to avoid poker room fees.',
        '',
        'Our players also get free:',
        '- Fresh NLH 50-5k hand histories;',
        '- iPoker Tools;',
        '- WPD branded layout.',
        '',
        'Before registering you have to delete cookies or use a clean browser.',
        'Follow the link:',
        'https://c.rsppartners.com/clickthrgh?btag=a_8499b_28l_9',
        'Register code: WPDEALS',
        '',
        'After registration, send us your login so we can check tracking.',
      ].join('\n'),
      registrationUrl: 'https://c.rsppartners.com/clickthrgh?btag=a_8499b_28l_9',
      promoCode: 'WPDEALS',
      sortOrder: 50,
      updatedAt: '2026-05-31'
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      language: 'RU',
      shortText: 'NEXA: доплата 40% net revenue по агентской кассе для игроков, за которых рум заплатит комиссию. Все транзакции только через нас.',
      fullText: [
        'В NEXA от нас доплата 40% net revenue по агентской кассе для игроков, за которых рум заплатит комиссию.',
        '',
        'Полные условия нашей сделки и ссылка на NEXA:',
        '- Доплата от нас - 40% от net revenue ежемесячно (т.е. от чистой прибыли рума, после вычета всех их "расходов" на игрока, включая страховки и оверлеи);',
        '- Бонус на первый депозит 100%;',
        '- Лидерборды внутри рума и релоад-бонусы.',
        '',
        'Важно! С 01.08.24 мы не можем гарантировать рейкбек, поскольку рум прекратил выплаты аффилейтам за игроков, которых AI FairGame считает профессионалами. Если рум заплатит комиссию за вас по итогам месяца, то мы выплатим рейкбек согласно сделке.',
        '',
        'Все транзакции в руме только через нас, путём p2p переводов.',
        'Для транзакций мы используем USDT в сети TRC20 | ERC20 | BEP20 и USDC в сети ERC20.',
        '',
        'Перед регистрацией обязательно нужно почистить cookies или использовать чистый браузер (т.е. тот, который обычно не используется).',
        'Качаем клиент:',
        'Nexa Poker Windows',
        'https://downloads.nexapoker.com/latest/NEXAPOKER.exe',
        'Nexa Poker Mac OS',
        'https://downloads.nexapoker.com/latest/NEXAPOKER.dmg',
        'Nexa Poker Android',
        'https://downloads.nexapoker.com/latest/NEXAPOKER.apk',
        'Nexa Poker iOS Store',
        'https://web.gei3ohci.com//#/enter?pid=75ZBNec&w=26&lang=en-us',
        '',
        'Бонус код: VIPRB (в поле "BONUS CODE (OPTIONAL)" вводить обязательно).',
        '',
        'Если вашей страны нет в списке на выбор, то выбираете любую, которая ближе географически к вашей. В форме регистрации вводим все свои данные (кроме страны, если её нет в списке).',
        '',
        'Верификацию нужно проходить только по запросу рума.',
        'Верификация упрощённая - только личность, адрес верифицировать не нужно и заполнять тоже (если получили письмо о полной верификации, можно его игнорировать - оно автоматическое).',
        '',
        'Любой софт в руме запрещён, включая ВПН.',
        '',
        'По завершении регистрации нам нужен юзернейм, ID аккаунта и почта в руме, чтобы проверить привязку и активность сделки.',
        '',
        'Также нам нужен ваш кошелек для доплат: USDT, USDC, Skrill.',
      ].join('\n'),
      registrationUrl: 'https://downloads.nexapoker.com/latest/NEXAPOKER.exe',
      promoCode: 'VIPRB',
      registrationNote: 'Agent cashier / p2p transactions only. Bonus code is mandatory.',
      sortOrder: 60,
      updatedAt: '2026-05-31'
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      language: 'EN',
      shortText: 'NEXA: 40% extra net revenue rakeback via Agent Cashier for players for whom the room pays commissions. All transactions are done through us.',
      fullText: [
        'In NEXA we offer a 40% extra net revenue rakeback via Agent Cashier for players for whom the room pays commissions.',
        '',
        'Full conditions of our deal and a link for NEXA:',
        '- Our extra rakeback is 40% of net revenue every month (i.e. of pure profit of the poker room after deducting all the room “expenses” on a player including insurances and overlays);',
        '- First deposit bonus 100% up to $5000;',
        '- Leaderboards and reload bonuses.',
        '',
        'Attention! Starting from 01.08.24 we are not able to guarantee rakeback due to NEXA introducing an AI system dividing players into Pro and Non-pro. Pro players are not being paid extra commission. If NEXA pays the commission for you at the end of the month, we will provide the rakeback as agreed.',
        '',
        'All transactions in the room are done exclusively through us via p2p.',
        'For such transactions we use USDT in TRC20 and BEP20 networks and USDC in ERC20 networks.',
        '',
        'Before registering you have to delete cookies or use a “clean” browser (any that is not usually used).',
        'Download the client:',
        'Nexa Poker Windows',
        'https://downloads.nexapoker.com/latest/NEXAPOKER.exe',
        'Nexa Poker Mac OS',
        'https://downloads.nexapoker.com/latest/NEXAPOKER.dmg',
        'Nexa Poker Android',
        'https://downloads.nexapoker.com/latest/NEXAPOKER.apk',
        'Nexa Poker iOS Store',
        'https://web.gei3ohci.com//#/enter?pid=75ZBNec&w=26&lang=en-us',
        '',
        'Bonus code: VIPRB (put into "BONUS CODE (OPTIONAL)") is mandatory.',
        '',
        'If your country is not in the list then choose any country that is close to yours geographically. Enter your actual data into the registration form (except the country of residence if it was not available to choose).',
        '',
        'Verification is only required at the poker room’s request.',
        'The Verification process is simplified - only an ID verification. Address verification is not to be done and not to be filled up (if you receive an email requesting full verification - it can be ignored).',
        '',
        'Any third party software is prohibited to use, VPN included.',
        '',
        'After successful registration we need your username, an account ID and an email to check the tracking and deal status.',
        '',
        'Also we need your wallet for extra rakeback: USDT, USDC, Skrill.',
      ].join('\n'),
      registrationUrl: 'https://downloads.nexapoker.com/latest/NEXAPOKER.exe',
      promoCode: 'VIPRB',
      registrationNote: 'Agent cashier / p2p transactions only. Bonus code is mandatory.',
      sortOrder: 70,
      updatedAt: '2026-05-31'
    }
  ],
  paymentMethods: [
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'USDT TRC20',
      currency: 'USDT',
      network: 'TRC20',
      feeText: 'без комиссии',
      sortOrder: 11
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'USDT ERC20',
      currency: 'USDT',
      network: 'ERC20',
      feeText: 'без комиссии',
      sortOrder: 12
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'USDC ERC20',
      currency: 'USDC',
      network: 'ERC20',
      feeText: 'без комиссии',
      sortOrder: 13
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'BTC',
      currency: 'BTC',
      network: 'BTC',
      feeText: 'без комиссии',
      sortOrder: 14
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'ETH',
      currency: 'ETH',
      network: 'Ethereum',
      feeText: 'без комиссии',
      sortOrder: 15
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'Skrill EUR',
      currency: 'Skrill',
      network: 'EUR',
      feeText: 'без комиссии',
      sortOrder: 16
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'USDC ERC20',
      currency: 'USDC',
      network: 'ERC20',
      limitsText: '10 EUR',
      feeText: 'без комиссии',
      sortOrder: 21
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'USDT ERC20',
      currency: 'USDT',
      network: 'ERC20',
      limitsText: '10 EUR',
      feeText: 'без комиссии',
      sortOrder: 22
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'USDT TRC20',
      currency: 'USDT',
      network: 'TRC20',
      limitsText: '200 EUR',
      feeText: 'без комиссии',
      sortOrder: 23
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'BTC',
      currency: 'BTC',
      network: 'BTC',
      limitsText: '500 EUR',
      feeText: 'без комиссии',
      sortOrder: 24
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'ETH',
      currency: 'ETH',
      network: 'Ethereum',
      limitsText: '500 EUR',
      feeText: 'без комиссии',
      sortOrder: 25
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'Skrill EUR',
      currency: 'Skrill',
      network: 'EUR',
      limitsText: '10 EUR',
      feeText: '1% комиссия',
      sortOrder: 30
    },
    {
      roomKey: 'redstar',
      dealType: 'General',
      operationType: 'Deposit',
      methodName: 'USDT TRC20',
      currency: 'USDT',
      network: 'TRC20',
      feeText: 'уточнить перед переводом',
      sortOrder: 40
    },
    {
      roomKey: 'redstar',
      dealType: 'General',
      operationType: 'Deposit',
      methodName: 'USDT ERC20',
      currency: 'USDT',
      network: 'ERC20',
      feeText: 'уточнить перед переводом',
      sortOrder: 41
    },
    {
      roomKey: 'redstar',
      dealType: 'General',
      operationType: 'Deposit',
      methodName: 'USDT BEP20',
      currency: 'USDT',
      network: 'BEP20',
      feeText: 'уточнить перед переводом',
      sortOrder: 42
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'USDT TRC20',
      currency: 'USDT',
      network: 'TRC20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 60
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'USDT ERC20',
      currency: 'USDT',
      network: 'ERC20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 61
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'USDT BEP20',
      currency: 'USDT',
      network: 'BEP20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 62
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'USDC ERC20',
      currency: 'USDC',
      network: 'ERC20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 63
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'BTC',
      currency: 'BTC',
      network: 'BTC',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 64
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'USDT TRC20',
      currency: 'USDT',
      network: 'TRC20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 70
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'USDT ERC20',
      currency: 'USDT',
      network: 'ERC20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 71
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'USDT BEP20',
      currency: 'USDT',
      network: 'BEP20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 72
    },
    {
      roomKey: 'nexa',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'USDC ERC20',
      currency: 'USDC',
      network: 'ERC20',
      feeText: 'через нас, p2p',
      note: 'Все транзакции в руме только через нас.',
      sortOrder: 73
    }
  ],
  wallets: []
}
