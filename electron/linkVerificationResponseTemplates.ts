import type { RoomDealType, RoomLanguage } from './roomKnowledgeSeed'

/**
 * Link-verification confirmation texts from docs/binding-confirmation-template.txt (owner, 2026-10-03).
 * Shipped once by migration step 2: a text is added only for a room that exists in the
 * local room directory and only where that room/deal type/language has no template yet,
 * so texts the operator already edited are kept.
 *
 * `dealType` is set when the source names the cash desk (agent / direct); otherwise the
 * text is added for every deal type the room has, or General when it has none.
 */
export interface LinkVerificationResponseTemplateSource {
  roomKey: string
  dealType?: RoomDealType
  language: RoomLanguage
  body: string
}

export const LINK_VERIFICATION_RESPONSE_TEMPLATES_2026_10: LinkVerificationResponseTemplateSource[] = [
  {
    roomKey: 'betonline',
    language: 'RU',
    body: `Ваш аккаунт в BetOnline: BXXXXXX успешно привязан к нам, сделка активна.
Можете вносить депозит и начинать играть.
Для активации бонуса на первый депозит введите код "POKER1000" (вводится в кассе).
Минимальная сумма депозита, которая активирует бонус - $50.
На отыгрыш отводится 30 календарных дней.
Отыгрывается частями по $5 за $50 рейка. Даёт 10% рейкбека.
Можно не проходить верификацию сразу, если планируете использовать крипту.
Однако, мы советуем сразу разобраться с этим, чтобы избежать сложностей потом в неподходящий момент.
Для этого отправляйте свои документы на почты: documents@betonline.ag / documents@betonlinecs.ag
Для верификации личности принимают фото/сканы паспорта, водительского удостоверения. Для верификации адреса - выписка из банка или счет на коммунальные услуги (стандартные для большинства румов).
Если всё ок, они не отвечают на это письмо. Если что-то не так, пишут в течение пары дней.
Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'betonline',
    language: 'EN',
    body: `Your account at BetOnline "BXXXXXX" has been successfully tracked by us, and the deal is active. You can deposit and start playing.
To activate the first deposit bonus, enter the code "POKER1000" (to be entered at the cashier). The minimum deposit amount to activate the bonus is $50. The bonus must be cleared within 30 calendar days. It is cleared in increments of $5 per $50 of rake, providing 10% rakeback.
You do not need to complete verification immediately if you plan to use cryptocurrency. However, we recommend addressing this right away to avoid complications later. To do so, send your documents to: documents@betonline.ag / documents@betonlinecs.ag
For identity verification, they accept photos/scans of your passport or driver's license. For address verification, a bank statement or utility bill (standard for most rooms) is required.
If everything is okay, they will not respond to your email.
If something is wrong, they will reply within a couple of days.
Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'betonline',
    language: 'ES',
    body: `Tu cuenta en BetOnline "BXXXXXX" ha sido vinculada con éxito y el acuerdo está activo. Ya puedes depositar y empezar a jugar.
Para activar el bono de primer depósito, introduce el código "POKER1000" (se introduce en el cajero). El depósito mínimo para activar el bono es de $50. El bono debe liberarse en un plazo de 30 días naturales. Se libera en partes de $5 por cada $50 de rake, lo que equivale a un 10% de rakeback.
No es necesario verificar la cuenta de inmediato si piensas usar criptomonedas. Sin embargo, te recomendamos hacerlo ahora para evitar complicaciones más adelante. Para ello, envía tus documentos a: documents@betonline.ag / documents@betonlinecs.ag
Para verificar tu identidad aceptan fotos/escaneos del pasaporte o del permiso de conducir. Para verificar la dirección se requiere un extracto bancario o una factura de servicios (lo estándar en la mayoría de las salas).
Si todo está bien, no responden al correo.
Si hay algún problema, te escribirán en un par de días.
¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'tigergaming',
    language: 'RU',
    body: `Ваш аккаунт в Tigergaming: TGXXXXXX успешно привязан к нам, сделка активна.
Можете вносить депозит и начинать играть.
Для активации бонуса на первый депозит введите код "NEWTG" (вводится в кассе).
Минимальная сумма депозита, которая активирует бонус - $50.
На отыгрыш отводится 30 календарных дней. Неотыгранная часть бонуса сгорает при кешауте.
Отыгрывается частями по $5 за $50 рейка. Даёт 10% рейкбека.
Можно не проходить верификацию сразу, если планируете использовать крипту.
Однако, мы советуем сразу разобраться с этим, чтобы избежать сложностей потом в неподходящий момент.
Для этого отправляйте свои документы на почты: documents@tigergaming.com / documents@tigergamingcs.com
Для верификации личности принимают фото/сканы паспорта, водительского удостоверения. Для верификации адреса - выписка из банка или счет на коммунальные услуги (стандартные для большинства румов).
Если всё ок, они не отвечают на это письмо. Если что-то не так, пишут в течение пары дней.
Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'tigergaming',
    language: 'EN',
    body: `Your account at Tigergaming has been successfully tracked by us, and the deal is active. You can deposit and start playing.
To activate the first deposit bonus, enter the code "NEWTG" (to be entered at the cashier). The minimum deposit amount to activate the bonus is $50. The bonus must be cleared within 30 calendar days. The first deposit bonus must fully be cleared before withdrawing funds. Otherwise, the remaining portion will be forfeited.
It is cleared in increments of $5 per $50 of rake, providing 10% rakeback.
You do not need to complete verification immediately if you plan to use cryptocurrency. However, we recommend addressing this right away to avoid complications later. To do so, send your documents to: documents@tigergaming.com
For identity verification, they accept photos/scans of your passport or driver's license. For address verification, a bank statement or utility bill (standard for most rooms) is required.
If everything is okay, they will not respond to your email.
If something is wrong, they will reply within a couple of days.
Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'tigergaming',
    language: 'ES',
    body: `Tu cuenta en Tigergaming ha sido vinculada con éxito y el acuerdo está activo. Ya puedes depositar y empezar a jugar.
Para activar el bono de primer depósito, introduce el código "NEWTG" (se introduce en el cajero). El depósito mínimo para activar el bono es de $50. El bono debe liberarse en un plazo de 30 días naturales. El bono de primer depósito debe liberarse por completo antes de retirar fondos; de lo contrario, la parte restante se perderá.
Se libera en partes de $5 por cada $50 de rake, lo que equivale a un 10% de rakeback.
No es necesario verificar la cuenta de inmediato si piensas usar criptomonedas. Sin embargo, te recomendamos hacerlo ahora para evitar complicaciones más adelante. Para ello, envía tus documentos a: documents@tigergaming.com
Para verificar tu identidad aceptan fotos/escaneos del pasaporte o del permiso de conducir. Para verificar la dirección se requiere un extracto bancario o una factura de servicios (lo estándar en la mayoría de las salas).
Si todo está bien, no responden al correo.
Si hay algún problema, te escribirán en un par de días.
¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'sportsbetting',
    language: 'RU',
    body: `Ваш аккаунт в SportsBetting: SBXXXXXX успешно привязан к нам, сделка активна.
Можете вносить депозит и начинать играть.
Для активации бонуса на первый депозит введите код "NEWSB" (вводится в кассе).
Минимальная сумма депозита, которая активирует бонус - $50.
На отыгрыш отводится 30 календарных дней.
Отыгрывается частями по $5 за $50 рейка. Даёт 10% рейкбека.
Можно не проходить верификацию сразу, если планируете использовать крипту.
Однако, мы советуем сразу разобраться с этим, чтобы избежать сложностей потом в неподходящий момент.
Для этого отправляйте свои документы на почту: cssupport@sportsbetting.ag / documents@sportsbettingcs.ag
Для верификации личности принимают фото/сканы паспорта, водительского удостоверения. Для верификации адреса - выписка из банка или счет на коммунальные услуги (стандартные для большинства румов).
Если всё ок, они не отвечают на это письмо. Если что-то не так, пишут в течение пары дней.
Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'sportsbetting',
    language: 'EN',
    body: `Your account at SportsBetting "SBXXXXXX" has been successfully tracked by us, and the deal is active. You can deposit and start playing.
To activate the first deposit bonus, enter the code "NEWSB" (to be entered at the cashier). The minimum deposit amount to activate the bonus is $50. The bonus must be cleared within 30 calendar days. It is cleared in increments of $5 per $50 of rake, providing 10% rakeback.
You do not need to complete verification immediately if you plan to use cryptocurrency. However, we recommend addressing this right away to avoid complications later. To do so, send your documents to: cssupport@sportsbetting.ag / documents@sportsbettingcs.ag
For identity verification, they accept photos/scans of your passport or driver's license. For address verification, a bank statement or utility bill (standard for most rooms) is required.
If everything is okay, they will not respond to your email.
If something is wrong, they will reply within a couple of days.
Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'sportsbetting',
    language: 'ES',
    body: `Tu cuenta en SportsBetting "SBXXXXXX" ha sido vinculada con éxito y el acuerdo está activo. Ya puedes depositar y empezar a jugar.
Para activar el bono de primer depósito, introduce el código "NEWSB" (se introduce en el cajero). El depósito mínimo para activar el bono es de $50. El bono debe liberarse en un plazo de 30 días naturales. Se libera en partes de $5 por cada $50 de rake, lo que equivale a un 10% de rakeback.
No es necesario verificar la cuenta de inmediato si piensas usar criptomonedas. Sin embargo, te recomendamos hacerlo ahora para evitar complicaciones más adelante. Para ello, envía tus documentos a: cssupport@sportsbetting.ag / documents@sportsbettingcs.ag
Para verificar tu identidad aceptan fotos/escaneos del pasaporte o del permiso de conducir. Para verificar la dirección se requiere un extracto bancario o una factura de servicios (lo estándar en la mayoría de las salas).
Si todo está bien, no responden al correo.
Si hay algún problema, te escribirán en un par de días.
¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'redstar',
    language: 'RU',
    body: `Аккаунт в Redstar привязан к нам, сделка активна. Апгрейд уровня рейкбека выполнен до уровня «Star».

Бонус на первый депозит 200% до $2,000. Активируется автоматически. Время на отыгрыш - 60 дней с момента его получения.
Выплаты по €2 приходят каждый раз после набора 200 RSP Points (за €1 рейка начисляется 10 поинтов).
Если первый деп через нас, мы его заказываем.
На данный момент, через нас можно депать и выводить только в USDT (TRC20/ERC20).

Если нужен майнинг, напиши, пожалуйста, какие лимиты и я скину.

Верификация будет затребована при достижении суммы 2000$ в депозитах или по решению администрации, но при желании можно пройти ее заранее.
Для этого необходимо предоставить на почту security@redstarpoker.eu копию паспорта/ID, а также либо копию страницы из паспорта с пропиской или местом регистрации, либо оплаченный счет за коммунальные услуги.`
  },
  {
    roomKey: 'redstar',
    language: 'EN',
    body: `Your account in Redstar is successfully tagged to us, and the deal is active. The VIP status has been upgraded.

The 200% first deposit bonus up to $2,000 will be activated automatically 15 minutes after the deposit and after logging back into the client. Payments of €2 are made each time you accumulate 200 RSP Points (10 points are awarded for every €1 of rake).

Verification will be required when the deposit amount reaches $2,000 or at the discretion of the administration, but we recommend completing verification in advance as it will definitely be required.
To do this, you need to provide a copy of your passport/ID, and either a copy of the page from your passport with your address or a utility bill in your name, to security@redstarpoker.eu.`
  },
  {
    roomKey: 'redstar',
    language: 'ES',
    body: `Tu cuenta en Redstar ha sido vinculada con éxito y el acuerdo está activo. Tu estatus VIP ha sido mejorado.

El bono de primer depósito del 200% hasta $2,000 se activará automáticamente 15 minutos después del depósito y tras volver a iniciar sesión en el cliente. Recibirás pagos de €2 cada vez que acumules 200 RSP Points (se otorgan 10 puntos por cada €1 de rake).

La verificación se solicitará cuando el total de depósitos alcance $2,000 o por decisión de la administración, pero te recomendamos completarla con antelación, ya que se requerirá con seguridad.
Para ello, envía a security@redstarpoker.eu una copia de tu pasaporte/ID y, además, una copia de la página del pasaporte con tu dirección o una factura de servicios a tu nombre.`
  },
  {
    roomKey: 'nexa',
    dealType: 'Agent',
    language: 'RU',
    body: `Ваш аккаунт NEXA привязан к нам, сделка активна.

Проходить верификацию не нужно. Верифицировать аккаунт нужно только по запросу от рума.

Бонус на первый депозит составляет 100% до $5000, что дает 10% рейкбека.
На отыгрыш даётся 90 дней.
У Nexa пока нет casino coins. Пока только Piker Bonus (бонус на первый депозит) и poker tickets.
Вся сумма бонуса отыгрывается за покерными столами.

Для депозита и вывода, свяжитесь с нами через этот чат.

Для депозита мы используем только крипто кошельки. Пожалуйста, переведите средства на один из кошельков и скиньте хеш транзакции.
Актуальные кошельки для депозита я скину ниже.

Для вывода отправьте средства на наш агентский аккаунт в руме:
McGregorUFC / ID 90368 / alexey@worldpokerdeals.com
P2P переводы осуществляются через меню переводов, которое находится в Cashier → Transfer. Заполните ID, username получателя и сумму перевода.

Также нам нужен кошелек для выплаты рейкбека от нас. Мы используем USDT, USDC, Skrill.`
  },
  {
    roomKey: 'nexa',
    dealType: 'Agent',
    language: 'EN',
    body: `Your account in NEXA has been successfully tracked, the deal is active.

You don't need to verify your account now. Verification is only required at the poker room’s request.

The first deposit bonus is 100% up to $5000, which gives you a 10% rakeback.
You have 90 days to meet the wagering requirements.
Nexa does not currently offer casino coins. For now, only the Piker Bonus (first deposit bonus) and poker tickets are available.
The entire bonus amount must be wagered at the poker tables.

For deposits and withdrawals, please contact us via this chat.

We only accept crypto wallets for deposits. Please transfer funds to one of the wallets and send us the transaction hash.
I’ve listed the current deposit wallets below.

For withdrawals, please send funds to our agent account in the room:
McGregorUFC / ID 90368 / alexey@worldpokerdeals.com
P2P transfers are carried out via the transfer menu, which can be found under Cashier → Transfer. Enter the recipient’s ID, username and the transfer amount.

We also need a wallet address to pay out your rakeback. We use USDT, USDC and Skrill.`
  },
  {
    roomKey: 'nexa',
    dealType: 'Agent',
    language: 'ES',
    body: `Tu cuenta en NEXA ha sido vinculada con éxito y el acuerdo está activo.

No necesitas verificar tu cuenta ahora. La verificación solo se requiere si la sala la solicita.

El bono de primer depósito es del 100% hasta $5000, lo que te da un 10% de rakeback.
Tienes 90 días para cumplir los requisitos de liberación.
Por ahora Nexa no ofrece casino coins. De momento solo están disponibles el Piker Bonus (bono de primer depósito) y los poker tickets.
Todo el importe del bono se libera en las mesas de póker.

Para depósitos y retiros, contáctanos por este chat.

Para los depósitos solo aceptamos billeteras de criptomonedas. Transfiere los fondos a una de las billeteras y envíanos el hash de la transacción.
Abajo te dejo las billeteras de depósito actuales.

Para retirar, envía los fondos a nuestra cuenta de agente en la sala:
McGregorUFC / ID 90368 / alexey@worldpokerdeals.com
Las transferencias P2P se hacen desde el menú de transferencias, en Cashier → Transfer. Introduce el ID y el username del destinatario y el importe de la transferencia.

También necesitamos una billetera para pagarte el rakeback. Usamos USDT, USDC y Skrill.`
  },
  {
    roomKey: 'wpt-global',
    language: 'RU',
    body: `Ваш аккаунт в WPT Global успешно привязан, сделка активна.
Документы для верификации необходимо отправить на адрес: verification@wptglobal.com
Для подтверждения личности требуется ID Card / Паспорт / Водительское удостоверение + селфи с предоставленным документом.
Для подтверждения адреса: счёт за коммунальные услуги / выписка из банка.
Для подтверждения депозита:
- если используется банковская карта, требуется чёткое цветное фото лицевой и обратной стороны карты.
- если используется кошелёк, требуется скриншот, подтверждающий владение кошельком. Должно быть видно URL сайта, имя аккаунта, email или имя игрока, сама транзакция депозита.
Бонус на первый депозит составляет 100% до $3000.
На отыгрыш даётся 60 дней.
50% бонуса отбивается за покерными столами (за каждые $10 рейка дают $1 обратно). Остальные 50% отбиваются в WPT Global Casino, при этом $1 возвращаются за каждые поставленные $500.
Также дают бесплатные билеты на турниры и Casino Coin, а также более $3,348 дополнительных бонусов в зависимости от суммы вашего первого депозита.
Бонус начисляется в течении 24ч.
Также нам нужен кошелек для выплаты рейкбека от нас. Мы используем USDT, USDC, Skrill.`
  },
  {
    roomKey: 'wpt-global',
    language: 'EN',
    body: `Your account in WPT Global has been successfully tracked, the deal is active.
Please send your verification documents to: verification@wptglobal.com
To verify your identity, you will need to provide an ID card, passport or driving licence, plus a selfie holding the document.
To verify your address: a utility bill or bank statement.
To verify your deposit:
- if using a bank card, a clear colour photo of the front and back of the card is required.
- if using an e-wallet / crypto, a screenshot confirming ownership of the wallet is required: the website URL, account name, email or player name, and the deposit transaction itself must be visible.
The first deposit bonus is 100% up to $3,000.
You have 60 days to meet the wagering requirements.
50% of the bonus is cleared at the poker tables (you receive $1 back for every $10 in rake). The remaining 50% is cleared at WPT Global Casino, with $1 returned for every $500 wagered.
You also receive free tournament tickets and Casino Coins, as well as over $3,348 in additional bonuses depending on the amount of your first deposit.
The bonus is credited within 24 hours.
We also need a wallet to pay out the rakeback from us. We use USDT, USDC and Skrill.`
  },
  {
    roomKey: 'wpt-global',
    language: 'ES',
    body: `Tu cuenta en WPT Global ha sido vinculada con éxito y el acuerdo está activo.
Envía tus documentos de verificación a: verification@wptglobal.com
Para verificar tu identidad necesitas un documento de identidad, pasaporte o permiso de conducir, además de un selfie sosteniendo el documento.
Para verificar tu dirección: una factura de servicios o un extracto bancario.
Para verificar tu depósito:
- si usas una tarjeta bancaria, se requiere una foto nítida y a color del anverso y el reverso de la tarjeta.
- si usas un monedero electrónico o criptomonedas, se requiere una captura de pantalla que demuestre que la billetera es tuya: deben verse la URL del sitio, el nombre de la cuenta, el email o el nombre del jugador y la propia transacción del depósito.
El bono de primer depósito es del 100% hasta $3,000.
Tienes 60 días para cumplir los requisitos de liberación.
El 50% del bono se libera en las mesas de póker (recibes $1 por cada $10 de rake). El 50% restante se libera en WPT Global Casino, con $1 devuelto por cada $500 apostados.
También recibes tickets gratuitos para torneos y Casino Coins, además de más de $3,348 en bonos adicionales según el importe de tu primer depósito.
El bono se acredita en un plazo de 24 horas.
También necesitamos una billetera para pagarte el rakeback. Usamos USDT, USDC y Skrill.`
  },
  {
    roomKey: 'coinpoker',
    language: 'RU',
    body: `Ваш аккаунт в Coinpoker успешно привязан к нам, сделка активна.

Бонус на первый депозит 150% до $2000 (активируется автоматически после пополнения счёта от $10). Бонус дает 10% рейкбека.
Срок отыгрыша 30 дней.

Для получения максимально возможного бонуса необходимо сделать первый депозит в размере $1,334.

Когда будет удобно, пришлите, пожалуйста, кошелек для выплаты приза за гонку: USDT, USDC, Skrill.`
  },
  {
    roomKey: 'coinpoker',
    language: 'EN',
    body: `Your account in Coinpoker has been successfully tracked, the deal is active.
Feel free to start playing.

First deposit bonus: 150% up to $2000 (automatically activated after a deposit of $10 or more), which gives you 10% of rakeback.
The bonus must be cleared within 30 days.
To receive the maximum possible bonus, you need to make an initial deposit of $1,334.

Could you also provide us with the wallet to which we will pay the race prize: USDT, USDC, Skrill.`
  },
  {
    roomKey: 'coinpoker',
    language: 'ES',
    body: `Tu cuenta en Coinpoker ha sido vinculada con éxito y el acuerdo está activo.
Ya puedes empezar a jugar.

Bono de primer depósito: 150% hasta $2000 (se activa automáticamente tras un depósito de $10 o más), que te da un 10% de rakeback.
El bono debe liberarse en un plazo de 30 días.
Para recibir el bono máximo posible, tu primer depósito debe ser de $1,334.

¿Podrías enviarnos también la billetera a la que pagaremos el premio de la carrera: USDT, USDC, Skrill?`
  },
  {
    roomKey: 'acr',
    language: 'RU',
    body: `Ваш аккаунт в ACR успешно привязан к нам, сделка активна.
Можете начинать играть.
Бонус: 100% до $2000. $1 отыгрывается за каждые $5 рейка. Даёт 20% чистого возврата. На отыгрыш 60 дней. Неотыгранная за первые два месяца часть бонуса сгорает.
Бонус на первый депозит активируется автоматически, бонус код вводить не нужно.
Отслеживать его можно в кассе в разделе «Rewards-Bonus». Минимальная сумма депозита для активации бонуса — $25.
Документы для верификации можно загрузить в клиенте или отправить на почту (support@americascardroom.eu) с пометкой «verification»:
- внутренний паспорт (главная страница);
- загранпаспорт (главная страница);
- водительское удостоверение.
До определенного порога, примерно 1000 USD, вывод на крипту возможен без верификации.
Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'acr',
    language: 'EN',
    body: `Your account in ACR has been successfully tracked, the deal is active.
Feel free to start playing.
Bonus: 100% up to $2000. $1 cleared for every $5 of rake. 20% net return. You have 60 days to clear the bonus. Any unclaimed bonus after the first two months will expire.
The first deposit bonus is activated automatically, no bonus code is required.
You can track it in the cashier under the "Rewards-Bonus" section. The minimum deposit amount to activate this offer is $25.
You can upload verification documents within the client, or you can send them to (support@americascardroom.eu) with the note "verification".
Internal passport (main page);
International passport (main page);
Driver's license.
Up to a certain threshold, approximately 1000 USD, withdrawals to crypto can be made without verification.
Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'acr',
    language: 'ES',
    body: `Tu cuenta en ACR ha sido vinculada con éxito y el acuerdo está activo.
Ya puedes empezar a jugar.
Bono: 100% hasta $2000. Se libera $1 por cada $5 de rake. 20% de retorno neto. Tienes 60 días para liberar el bono. La parte del bono no liberada tras los dos primeros meses caducará.
El bono de primer depósito se activa automáticamente, no hace falta ningún código.
Puedes seguirlo en el cajero, en la sección "Rewards-Bonus". El depósito mínimo para activar esta oferta es de $25.
Puedes subir los documentos de verificación en el cliente o enviarlos a (support@americascardroom.eu) con la nota "verification":
Documento de identidad nacional (página principal);
Pasaporte (página principal);
Permiso de conducir.
Hasta cierto límite, aproximadamente 1000 USD, se puede retirar a cripto sin verificación.
¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'bcp',
    language: 'RU',
    body: `Аккаунт в BCP успешно привязан к нам, сделка активна.
Бонус на первый депозит активируется автоматически, бонус код не вводится. Даёт 20% чистого возврата. На отыгрыш 60 дней. Отслеживать его можно в кассе в разделе «Rewards-Bonus».
Для верификации документы можно загружать внутри клиента, но можно и на почту (support@blackchippoker.eu) с пометкой “верификация”:
- внутренний паспорт / загранпаспорт (ID) / водительское удостоверение.
Для верификации адреса (пдф скан не принимается):
- счет за коммунальные услуги / выписка из банка.
Не старше 3 месяцев, имя и адрес должны быть четко видны.
Вывод средств без верификации возможен при выводе через крипту (до примерно 1k$), однако советуем верифицироваться сразу, чтобы избежать сложностей потом в неподходящий момент.
Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'bcp',
    language: 'EN',
    body: `Your account in BCP has been successfully tracked, the deal is active.
The first deposit bonus is activated automatically, no bonus code is required. It gives a 20% net return. You have 60 days to clear it. You can track it in the cashier under the "Rewards-Bonus" section.
You can upload verification documents within the client, or send them to (support@blackchippoker.eu) with the note "verification":
- internal passport / international passport (ID) / driver's license.
For address verification (PDF scans are not accepted):
- a utility bill / bank statement.
No older than 3 months; your name and address must be clearly visible.
Withdrawals without verification are possible to crypto (up to about $1k), but we recommend verifying right away to avoid complications later at an inconvenient moment.
Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'bcp',
    language: 'ES',
    body: `Tu cuenta en BCP ha sido vinculada con éxito y el acuerdo está activo.
El bono de primer depósito se activa automáticamente, no hace falta ningún código. Da un 20% de retorno neto. Tienes 60 días para liberarlo. Puedes seguirlo en el cajero, en la sección "Rewards-Bonus".
Puedes subir los documentos de verificación en el cliente o enviarlos a (support@blackchippoker.eu) con la nota "verification":
- documento de identidad nacional / pasaporte (ID) / permiso de conducir.
Para verificar la dirección (no se aceptan escaneos en PDF):
- una factura de servicios / un extracto bancario.
Con una antigüedad máxima de 3 meses; tu nombre y dirección deben verse con claridad.
Se puede retirar sin verificación a cripto (hasta unos $1k), pero te recomendamos verificarte de inmediato para evitar complicaciones más adelante en un mal momento.
¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'champion-poker',
    dealType: 'Agent',
    language: 'RU',
    body: `Аккаунт в Champion успешно привязан к нам, сделка активна.
Также выполнен апгрейд уровня рб в руме до 30% по вип-уровню SPADES.
Рейкбек начисляется вручную. Игрок должен поменять очки в кассе на кеш (100 баллов на €1). Срок действия очков 180 дней.
Верифицировать нужно только личность. Обе стороны ID или главный разворот паспорта. Верификация адреса не требуется.
Почта для верификаций: kyc@championpoker.com
Депозит/вывод - только через нас. Рум запросит у вас верификацию адреса, если будете пользоваться кассой самостоятельно. Срок обработки заявки на транзакцию до 3х дней (но сейчас быстрее).
Для транзакций через нас доступны:
Депозит: BTC / TRC20 / ERC20 / Skrill - без комиссии, Luxon Pay - 2% комиссия.
Вывод: BTC / TRC20 / ERC20 - без комиссии, Skrill - 1% комиссия, Luxon Pay - 2% комиссия.

Процедура вывода следующая: пишешь нам, мы делаем заявку в рум, они списывают средства и в течении 3 рабочих дней отправляют на кошелёк.
Когда будет удобно, пришлите, пожалуйста, кошелек для доплат от нас (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'champion-poker',
    dealType: 'Agent',
    language: 'EN',
    body: `Your account has been successfully tracked, the deal is active.
The boost of your account to the maximum rakeback level within the room to Spades with 30% rakeback has been completed.
Only identity verification is required. Both sides of the ID or the main page of the passport. Address verification is not required. The document can be sent to: kyc@championpoker.com
Deposit/withdrawal - only through us. The room will request address verification from you if you use the cashier yourself. The processing time for a transaction request is up to 3 days (but now it is faster).
The following options are available for transactions through us:
Deposit: BTC / TRC20 / ERC20 / Skrill - no fee, Luxon Pay - 2% fee.
Withdrawal: BTC / TRC20 / ERC20 - no fee, Skrill - 1% fee, Luxon Pay - 2% fee.
To deposit, let me know the method so I can send you the current wallet address. Withdrawals through us take 3 business days (we process the request immediately, but the room takes 3 business days to process).
Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'champion-poker',
    dealType: 'Agent',
    language: 'ES',
    body: `Tu cuenta ha sido vinculada con éxito y el acuerdo está activo.
Hemos subido tu cuenta al nivel máximo de rakeback de la sala: Spades, con un 30% de rakeback.
Solo se requiere verificar la identidad: ambas caras del documento de identidad o la página principal del pasaporte. No se requiere verificar la dirección. Puedes enviar el documento a: kyc@championpoker.com
Depósitos/retiros: solo a través de nosotros. La sala te pedirá verificar la dirección si usas el cajero por tu cuenta. El plazo de tramitación de una solicitud es de hasta 3 días (aunque ahora es más rápido).
Para las transacciones a través de nosotros están disponibles:
Depósito: BTC / TRC20 / ERC20 / Skrill - sin comisión, Luxon Pay - 2% de comisión.
Retiro: BTC / TRC20 / ERC20 - sin comisión, Skrill - 1% de comisión, Luxon Pay - 2% de comisión.
Para depositar, dime el método y te envío la dirección de billetera actual. Los retiros a través de nosotros tardan 3 días hábiles (tramitamos la solicitud de inmediato, pero la sala tarda 3 días hábiles en procesarla).
¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'champion-poker',
    dealType: 'Direct',
    language: 'RU',
    body: `Аккаунт в Champion успешно привязан к нам, сделка активна.
Также выполнен апгрейд уровня рб в руме до 30% по вип-уровню SPADES.
Рейкбек начисляется вручную. Игрок должен поменять очки в кассе на кеш (100 баллов на €1). Срок действия очков 180 дней.
Для верификации нужно отправлять: обе стороны ID/паспорта/водительского удостоверения + счет за коммунальные услуги (за исключением счетов за мобильную связь) / налоговый счет / выписку из банковского счета или любую корреспонденцию от центрального или местного органа власти.
Документы можно отправить на почту: kyc@championpoker.com или загрузить в аккаунте на сайте рума (My Account - Start KYC Process).
Когда будет удобно, пришлите, пожалуйста, кошелек для доплат от нас (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'champion-poker',
    dealType: 'Direct',
    language: 'EN',
    body: `Your account in Champion poker has been successfully tracked, the deal is active.
The boost of your account to the maximum rakeback level within the room to Spades with 30% rakeback has been completed.
To make deposits and withdrawals on your own, you need to complete full verification.
For identity verification: both sides of your ID / main page of your passport / driver’s license.
For address verification: a utility bill (excluding mobile phone bills) / tax bill / bank statement or any correspondence from a central or local authority.
Please note that the provided documents must be dated within the last three months.
You can send the documents to kyc@championpoker.com or upload them on the room's website in your account using the Start KYC Process button.`
  },
  {
    roomKey: 'champion-poker',
    dealType: 'Direct',
    language: 'ES',
    body: `Tu cuenta en Champion poker ha sido vinculada con éxito y el acuerdo está activo.
Hemos subido tu cuenta al nivel máximo de rakeback de la sala: Spades, con un 30% de rakeback.
Para depositar y retirar por tu cuenta, debes completar la verificación completa.
Para verificar tu identidad: ambas caras de tu documento de identidad / página principal del pasaporte / permiso de conducir.
Para verificar tu dirección: una factura de servicios (excepto facturas de telefonía móvil) / factura de impuestos / extracto bancario o cualquier correspondencia de una autoridad central o local.
Ten en cuenta que los documentos deben tener una fecha de los últimos tres meses.
Puedes enviar los documentos a kyc@championpoker.com o subirlos en tu cuenta en la web de la sala con el botón Start KYC Process.`
  },
  {
    roomKey: 'cristal-poker',
    language: 'RU',
    body: `Аккаунт в Cristal Poker успешно привязан к нам, сделка активна.
Бонус на первый депозит в размере 100% до €2,000.
Активируется автоматически при пополнении счета на сумму от 20 евро.
Выплаты по 30€ за каждые 100€ рейка.
Время отыгрыша 90 дней. Любой кешаут в этот период аннулирует всю неотыгранную часть бонуса.
Для прохождения верификации необходимо отправить паспорт / ID / водительское удостоверение на почту support@cristalpoker.com
В теме письма указать никнейм или ID (можно найти в разделе "Deposit-My Account").
Когда будет удобно, скинь, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'cristal-poker',
    language: 'EN',
    body: `Your Cristal Poker account has been successfully tracked, the deal is active.
The first deposit bonus is 100% up to €2,000.
It activates automatically when depositing at least €20.
Payouts are €30 for every €100 in rake.
The bonus must be cleared within 90 days.
Any cashout during this period will void any uncleared bonus.
For verification, you need to send your passport/ID/driver's license to support@cristalpoker.com.
Please mention your nickname or ID in the email subject (the ID can be found in the "Deposit-My Account" section).
Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'cristal-poker',
    language: 'ES',
    body: `Tu cuenta en Cristal Poker ha sido vinculada con éxito y el acuerdo está activo.
El bono de primer depósito es del 100% hasta €2,000.
Se activa automáticamente al depositar al menos €20.
Los pagos son de €30 por cada €100 de rake.
El bono debe liberarse en un plazo de 90 días.
Cualquier retiro durante este periodo anula la parte del bono no liberada.
Para la verificación, envía tu pasaporte/ID/permiso de conducir a support@cristalpoker.com.
Indica tu nickname o ID en el asunto del correo (el ID se encuentra en la sección "Deposit-My Account").
¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'pokerking',
    language: 'RU',
    body: `Аккаунт в PokerKing привязан к нам, сделка активна.

Верификация стандартная. Документы нужно загрузить через клиент:
My Account - Deposit - Certification.

Бонус на первый депозит 100% до $2000. Активируется автоматически, бонус код вводить не нужно.
Бонус выплачивается частями по мере накопления Status Points ($1 за каждые набранные 27.5 Award Points), что дает возможность получать дополнительные 20% рейкбека на этот период.
На отыгрыш дается 60 дней.

Когда будет удобно, скинь, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'pokerking',
    language: 'EN',
    body: `Your account in PokerKing has been successfully tracked, the deal is active.

Bonus on the first deposit 100% up to $2000. Activated automatically, no bonus code needs to be entered.
Bonus is paid in installments as you accumulate Status Points ($1 for every 27.5 Award Points accumulated), which gives you an opportunity to receive an additional 20% rakeback for this period.
Wagering period is 60 days.

For verification, standard documents are required and should be uploaded through the client:
My Account - Deposit - Certification.

Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'pokerking',
    language: 'ES',
    body: `Tu cuenta en PokerKing ha sido vinculada con éxito y el acuerdo está activo.

Bono de primer depósito del 100% hasta $2000. Se activa automáticamente, no hace falta introducir ningún código.
El bono se paga por partes a medida que acumulas Status Points ($1 por cada 27.5 Award Points acumulados), lo que te permite recibir un 20% adicional de rakeback durante ese periodo.
El plazo de liberación es de 60 días.

Para la verificación se requieren los documentos estándar, que deben subirse desde el cliente:
My Account - Deposit - Certification.

¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'rptbet',
    language: 'RU',
    body: `Аккаунт в RPTbet успешно привязан к нам, сделка активна.

Бонус активируется автоматически, бонус код вводить не нужно.
Срок отыгрыша 30 дней.

Верификацию нужно проходить на сайте в личном кабинете через кнопку "Пройти Верификацию":
- заполнить контактную и персональную информацию;
- загрузить фото внутреннего паспорта / ID / загранпаспорта.
Проверка происходит в течение часа.
После успешного прохождения верификации, появится зеленый щит “Аккаунт верифицирован”.`
  },
  {
    roomKey: 'rptbet',
    language: 'EN',
    body: `The account in RPTbet has been successfully tracked, the deal is active.

The bonus is activated automatically, no bonus code needs to be entered.
The wagering period is 30 days.

Verification should be done on the site in your profile through the button "Pass Verification":
- fill in contact and personal information;
- upload a photo of your ID/passport.
Verification takes place within an hour.
After successful verification, the green shield “Account verified” will appear.`
  },
  {
    roomKey: 'rptbet',
    language: 'ES',
    body: `Tu cuenta en RPTbet ha sido vinculada con éxito y el acuerdo está activo.

El bono se activa automáticamente, no hace falta introducir ningún código.
El plazo de liberación es de 30 días.

La verificación se hace en la web, en tu perfil, con el botón "Pass Verification":
- completa tus datos de contacto y personales;
- sube una foto de tu documento de identidad/pasaporte.
La verificación tarda hasta una hora.
Tras verificarte con éxito, aparecerá el escudo verde “Account verified”.`
  },
  {
    roomKey: 'partypoker',
    language: 'RU',
    body: `Аккаунт в Partypoker успешно привязан к нам, сделка активна.

Для верификации необходимы копии документов, подтверждающих личность (паспорт/ID) и адрес (любой официальный документ, например, выписка из банка).
Вы можете загрузить их в клиент. Для этого нажмите на свой аватар. На новой странице появится ссылка (страница загрузки файла). Выберите тип документа из списка и нажмите «продолжить».
Загрузите копию документа и нажмите на кнопку «Загрузить». Сканы могут быть проверены в течение недели.
Вы получите электронное письмо о результатах проверки.

В качестве бонуса на первый депозит PartyPoker предлагает игрокам выбрать один из трех вариантов:
$10 билетов на спины и МТТ за внесение $10,
$30 билетов за внесение $20,
Classic 100% бонус до $600.
Когда речь идет об акции 100% до $600, все предельно просто: при регистрации в руме выбираете эту опцию, вносите на счет от $10 до $600 и получаете +100% к сумме депозита в виде бонуса, который начисляется равными долями по 10%, что дает +20% к рейкбеку в период отыгрыша.
Бонус должен быть отыгран в течение 90 дней.`
  },
  {
    roomKey: 'partypoker',
    language: 'EN',
    body: `Your account in Partypoker has been successfully tracked, the deal is active. Feel free to start playing.

To pass KYC, you need copies of documents proving your full name (passport/ID) and address (any official document such as a bank statement).
You can upload them in the client. To do this, click on your avatar. On the new page there will be a link (file upload page). Then select your document type from the list and click on ‘continue’.
Upload a copy of your document and click on ‘Upload’. Scans can be verified for up to a week.
You will receive an email about the verification results.

As a first deposit bonus, PartyPoker offers players to choose one of three options:
$10 tickets for spins and MTTs for depositing $10,
$30 tickets for depositing $20,
Classic 100% bonus up to $600.
When it comes to 100% up to $600 promotion, everything is extremely simple: when registering in the room, choose this option, deposit from $10 to $600 to your account, and get +100% to the deposit amount in the form of a bonus, which is credited in equal shares of 10%, which gives +20% to rakeback during the wagering period.
The bonus must be cleared within 90 days.`
  },
  {
    roomKey: 'partypoker',
    language: 'ES',
    body: `Tu cuenta en Partypoker ha sido vinculada con éxito y el acuerdo está activo. Ya puedes empezar a jugar.

Para pasar el KYC necesitas copias de documentos que acrediten tu nombre completo (pasaporte/ID) y tu dirección (cualquier documento oficial, por ejemplo un extracto bancario).
Puedes subirlos en el cliente. Para ello, haz clic en tu avatar. En la nueva página aparecerá un enlace (página de carga de archivos). Elige el tipo de documento de la lista y haz clic en ‘continuar’.
Sube una copia del documento y haz clic en ‘Subir’. La revisión de los escaneos puede tardar hasta una semana.
Recibirás un correo con el resultado de la verificación.

Como bono de primer depósito, PartyPoker ofrece elegir una de tres opciones:
$10 en tickets para spins y MTT por depositar $10,
$30 en tickets por depositar $20,
Bono clásico del 100% hasta $600.
Con la promoción del 100% hasta $600 todo es muy sencillo: al registrarte en la sala eliges esta opción, depositas entre $10 y $600 y recibes un +100% del depósito en forma de bono, que se acredita en partes iguales del 10%, lo que da un +20% de rakeback durante el periodo de liberación.
El bono debe liberarse en un plazo de 90 días.`
  },
  {
    roomKey: 'basepoker',
    language: 'RU',
    body: `Ваш аккаунт в Basepoker успешно привязан к нам, сделка активна.
Можете вносить депозит и начинать играть.

Верификация личности потребуется для вывода суммы свыше $10K.

Бонус на первый депозит 150% до $2,000.
Срок отыгрыша — 60 дней.
Бонус начисляется после депозита от $10. Для активации бонуса перед пополнением счета необходимо нажать кнопку “Activate Bonus”.
За каждый доллар бонуса нужно сделать $2 рейка за кеш-столами.
Каждый раз, когда игрок набирает 10% от необходимого рейка для полного отыгрыша бонуса, он получает на счет 10% от суммы бонуса.
Отслеживать прогресс можно в разделе “Rewards → Deposit Bonus” в вертикальном меню на сайте Base Poker.

Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'basepoker',
    language: 'EN',
    body: `Your Basepoker account has been successfully tracked, and the deal is active.
You can now make a deposit and start playing.

Identity verification will be required for withdrawals over $10K.

First deposit bonus of 150% up to $2,000.
Wagering requirement — 60 days.
The bonus is credited after a deposit of $10 or more. To activate the bonus, click the “Activate Bonus” button before depositing funds.
For each dollar of the bonus, you need to earn $2 in rake at the cash tables.
Each time a player earns 10% of the rake required to fully wager the bonus, they receive 10% of the bonus amount in their account.
You can track your progress in the “Rewards → Deposit Bonus” section in the vertical menu on the Basepoker website.

Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'basepoker',
    language: 'ES',
    body: `Tu cuenta en Basepoker ha sido vinculada con éxito y el acuerdo está activo.
Ya puedes depositar y empezar a jugar.

Se requerirá verificar la identidad para retiros superiores a $10K.

Bono de primer depósito del 150% hasta $2,000.
Plazo de liberación: 60 días.
El bono se acredita tras un depósito de $10 o más. Para activarlo, pulsa el botón “Activate Bonus” antes de depositar.
Por cada dólar de bono necesitas generar $2 de rake en las mesas de cash.
Cada vez que generas el 10% del rake necesario para liberar el bono completo, recibes en tu cuenta el 10% del importe del bono.
Puedes seguir tu progreso en la sección “Rewards → Deposit Bonus” del menú vertical de la web de Basepoker.

¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'shenpoker',
    language: 'RU',
    body: `Ваш аккаунт в Shenpoker успешно привязан к нам, сделка активна.
Можете вносить депозит и начинать играть.

Верификация не требуется.

Бонус на первый депозит: 100% до 10 000 MYR через вейджер (turnover) 50Х.
(Этот вейджер только для Покера, Super 10, Omaha, Domino).
Promo code: WB

Минимальный депозит, необходимый для активации бонуса, составляет 50 MYR. Чтобы получить бонус, вы должны связаться со службой поддержки через LiveChat, чтобы активировать его перед началом игры. Если баланс депозита был использован, бонус не будет предоставлен.

Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'shenpoker',
    language: 'EN',
    body: `Your account in Shenpoker has been successfully tracked by us, and the deal is active. You can deposit and start playing.

No verification required.

First deposit bonus: 100% up to MYR 10,000 with a 50X turnover requirement.
(This turnover requirement applies only to Poker, Super 10, Omaha, and Domino).
Promo code: WB
The minimum deposit required to activate the bonus is MYR 50. To receive the bonus, you must contact customer support via LiveChat to activate it before you start playing. If the deposit balance has been used, the bonus will not be granted.

Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'shenpoker',
    language: 'ES',
    body: `Tu cuenta en Shenpoker ha sido vinculada con éxito y el acuerdo está activo. Ya puedes depositar y empezar a jugar.

No se requiere verificación.

Bono de primer depósito: 100% hasta 10,000 MYR con un requisito de apuesta (turnover) de 50X.
(Este requisito se aplica solo a Poker, Super 10, Omaha y Domino).
Código promocional: WB
El depósito mínimo para activar el bono es de 50 MYR. Para recibir el bono debes contactar con soporte por LiveChat y activarlo antes de empezar a jugar. Si ya se ha usado el saldo del depósito, el bono no se concederá.

¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'betfair-poker',
    language: 'RU',
    body: `Ваш аккаунт в BetFair успешно привязан к нам, сделка активна. Выполнен апгрейд аккаунта до максимального уровня рейкбека.

Бонуса на первый депозит на данный момент нет.`
  },
  {
    roomKey: 'betfair-poker',
    language: 'EN',
    body: `Your account in BetFair is successfully tracked by us, and the deal is active. The boost of your account to the maximum rakeback level has been completed.

There is no first deposit bonus at the moment.`
  },
  {
    roomKey: 'betfair-poker',
    language: 'ES',
    body: `Tu cuenta en BetFair ha sido vinculada con éxito y el acuerdo está activo. Hemos subido tu cuenta al nivel máximo de rakeback.

Por el momento no hay bono de primer depósito.`
  },
  {
    roomKey: 'bcpoker',
    language: 'RU',
    body: `Ваш аккаунт в BCpoker успешно привязан к нам, сделка активна.
Можете вносить депозит и начинать играть.

Бонус на первый депозит — 10% до $200, который приходит на счет сразу после депозита. Чтобы вывести бонусные средства, нужно набить х10 рейка от суммы депозита.
Перед получением бонуса необходимо пройти верификацию (KYC).

Сразу после регистрации и верификации можно запросить бездепозитный бонус $5 в токене BC. Запрос отправляется в поддержку по адресу support@bcpoker.com.
Чтобы вывести бонус, нужно набить 50 долларов рейка в кеш-играх. Ограничений по времени отыгрыша нет.

Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'bcpoker',
    language: 'EN',
    body: `Your BCpoker account has been successfully tracked by us, and the deal is active.
You can make a deposit and start playing.

The first deposit bonus is 10% up to £200, which is credited to your account immediately after the deposit. To withdraw the bonus funds, you need to earn x10 rake from the deposit amount.
Before receiving the bonus, you must complete verification (KYC).

After registration and verification, you can request a no deposit bonus of £5 in BC tokens. The request is sent to support at support@bcpoker.com.
To withdraw the bonus, you need to earn £50 in rake in cash games. There are no time restrictions on wagering.

Could you also provide us with a wallet where we are going to send extra rakeback to (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'bcpoker',
    language: 'ES',
    body: `Tu cuenta en BCpoker ha sido vinculada con éxito y el acuerdo está activo.
Ya puedes depositar y empezar a jugar.

El bono de primer depósito es del 10% hasta £200 y se acredita en tu cuenta justo después del depósito. Para retirar los fondos del bono, debes generar x10 de rake sobre el importe del depósito.
Antes de recibir el bono debes completar la verificación (KYC).

Tras registrarte y verificarte, puedes solicitar un bono sin depósito de £5 en tokens BC. La solicitud se envía a soporte en support@bcpoker.com.
Para retirar el bono debes generar £50 de rake en juegos de cash. No hay límite de tiempo para liberarlo.

¿Podrías enviarnos también una billetera para los pagos adicionales de rakeback (USDT, USDC, Skrill)?`
  },
  {
    roomKey: 'stake-poker',
    language: 'RU',
    body: `Ваш аккаунт в Stake poker успешно привязан к нам, сделка активна.
Можете вносить депозит и начинать играть.
Бонуса на первый депозит нет.

Для прохождения верификации необходимо загрузить паспорт / ID / водительское удостоверение на странице https://stake.com/settings/account в разделе verification

Когда будет удобно, пришлите, пожалуйста, кошелек для доплат (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'stake-poker',
    language: 'EN',
    body: `Your Stake Poker account has been successfully tracked by us, and the deal is active. You can make a deposit and start playing.
There is no first deposit bonus.
To complete verification, you need to upload your passport / ID / driver’s license on the page https://stake.com/settings/account in the verification section.
When convenient, please send the wallet for additional payments (USDT, USDC, Skrill).`
  },
  {
    roomKey: 'stake-poker',
    language: 'ES',
    body: `Tu cuenta en Stake Poker ha sido vinculada con éxito y el acuerdo está activo. Ya puedes depositar y empezar a jugar.
No hay bono de primer depósito.
Para completar la verificación, sube tu pasaporte / ID / permiso de conducir en la página https://stake.com/settings/account, en la sección verification.
Cuando puedas, envíanos tu billetera para los pagos adicionales (USDT, USDC, Skrill).`
  },
  {
    roomKey: '1win',
    language: 'RU',
    body: `Аккаунт в 1win успешно привязан к нам, сделка активна.
Можно вносить депозит и начинать играть.
Верификацию нужно проходить только по запросу от рума. Можно играть без неё.`
  },
  {
    roomKey: '1win',
    language: 'EN',
    body: `Your 1win account has been successfully tracked by us, and the deal is active.
You can now make a deposit and start playing.
Verification should only be carried out upon request from the room. You can play without verification.`
  },
  {
    roomKey: '1win',
    language: 'ES',
    body: `Tu cuenta en 1win ha sido vinculada con éxito y el acuerdo está activo.
Ya puedes depositar y empezar a jugar.
La verificación solo es necesaria si la sala la solicita. Puedes jugar sin ella.`
  },
]
