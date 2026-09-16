/**
 * Romanian.
 *
 * Written to match the register of the English, which addresses the reader
 * directly and avoids the language of machinery. So this uses "tu" throughout,
 * never the formal "dumneavoastră", and never says "optimizează" or
 * "eficiență": these are decisions about a holiday.
 *
 * Three things a translation of this page has to get right, and all three are
 * the sort of thing a reader notices immediately:
 *
 *   Plurals have three forms, and "de" appears at twenty. "1 zi", "3 zile",
 *   "21 de zile". Every counted noun below carries all three.
 *
 *   Months and weekdays are lower case (see calendarNames.js).
 *
 *   The comma-below letters are ș and ț (U+0219, U+021B), not the
 *   cedilla-bearing ş and ţ that older Windows codepages used. They look nearly
 *   identical and the wrong one is a reliable sign that nobody Romanian read the
 *   page. A test checks for the wrong ones.
 *
 * Holiday names are not translated anywhere in this app: they arrive from the
 * library in each country's own language, and Sfântul Andrei is already
 * Romanian.
 */
export default {
  'lang.name': 'Română',
  'lang.switch': 'Limba',
  'lang.pick': 'Alege o limbă',

  'meta.title': 'BridgeDays · Află ce zile de concediu să ceri',
  'meta.description':
    'Alege-ți țara și spune câte zile de concediu ai. BridgeDays calculează ce zile să ceri ca să se lege cu weekendurile și sărbătorile legale în cele mai lungi perioade libere posibile. Rulează în întregime în browserul tău.',

  'a11y.skipToAnswer': 'Sari la răspuns',

  'header.tagline': 'Ceri {days} zile. Primești {off}.',
  'header.themeSwitch': 'Comută pe tema {theme}',
  'header.themeDark': 'Închis',
  'header.themeLight': 'Deschis',
  'header.themeDarkName': 'închisă',
  'header.themeLightName': 'deschisă',

  'claims.label': 'Ce nu face aplicația asta',
  'claims.noSignup': 'Fără cont',
  'claims.offline': 'Merge offline',
  'claims.nothingLeaves': 'Nimic nu pleacă de pe dispozitivul tău',
  'claims.free': 'Gratuit',
  'claims.noCookies': 'Fără cookie-uri',
  'claims.noTracking': 'Fără urmărire',

  'controls.country': 'Țara',
  'controls.days': 'Zile de concediu',
  'controls.year': 'Anul',
  'controls.region': 'Regiunea',
  'controls.optional': '(opțional)',
  'controls.wholeCountry': 'Toată țara',
  'controls.regionMatters': 'Sărbătorile chiar diferă aici, așa că asta schimbă răspunsul.',
  'controls.moreOptions': 'Mai multe opțiuni',
  'controls.workDays': 'În ce zile lucrezi?',
  'controls.noWorkDays': 'Nu ai bifată nicio zi lucrătoare, deci nu ai ce să ceri.',
  'controls.workDaysCount': {
    one: '{count} zi lucrătoare pe săptămână.',
    few: '{count} zile lucrătoare pe săptămână.',
    other: '{count} de zile lucrătoare pe săptămână.'
  },
  'controls.objective': 'Ce vrei să obții?',
  'controls.minBreak': 'Cea mai scurtă vacanță care merită cerută: {days}',
  'controls.minBreakHint': 'Orice e mai scurt de atât rămâne în afara planului.',
  'controls.maxBreaks': 'Cel mult atâtea vacanțe separate (opțional)',
  'controls.maxBreaksPlaceholder': 'Fără limită',
  'controls.maxBreaksHint': 'Util dacă angajatorul te lasă să ceri concediu doar de câteva ori pe an.',
  'controls.leaveYear': 'Anul de concediu',
  'controls.starts': 'Începe',
  'controls.ends': 'Se termină',
  'controls.useCalendarYear': 'Folosește tot anul calendaristic',
  'controls.customLeaveYear': 'Anul meu de concediu nu începe în ianuarie',
  'controls.birthday': 'Ziua ta de naștere',
  'controls.birthdayOff': 'Angajatorul îmi dă liber de ziua mea',
  'controls.birthdayOffHint':
    'Devine zi liberă, ca o sărbătoare legală, așa că planul poate construi o vacanță în jurul ei.',
  'controls.birthdayWhich': 'Ce zi este?',
  'controls.month': 'Luna',
  'controls.day': 'Ziua',

  'picker.choose': 'Alege',
  'picker.search': 'Caută: {label}',
  'picker.searchPlaceholder': 'Scrie ca să cauți',
  'picker.empty': 'Nimic nu se potrivește cu „{query}”.',
  'controls.birthdayMonthLabel': 'Luna în care e ziua ta de naștere',
  'controls.birthdayDayLabel': 'Ziua în care e ziua ta de naștere',
  'controls.birthdayPick': 'Alege o lună și o zi. Contează ca zi liberă în fiecare an.',
  'controls.birthdayNoYear':
    'Nu se cere și nu se salvează niciun an, așa că un link pe care îl trimiți nu poate spune ce vârstă ai.',
  'controls.birthdayLeapDay':
    'Ziua de 29 vine o dată la patru ani. BridgeDays o folosește pe cea de 28 în ceilalți ani, ceea ce s-ar putea să nu fie ce face angajatorul tău.',
  'controls.givenBack': 'Angajatorul îmi dă o zi înapoi când o sărbătoare cade în weekend',
  'controls.givenBackHint':
    'Adaugă câte o zi la concediul tău pentru fiecare. Verifică-ți contractul, pentru că mulți angajatori nu fac asta.',
  'controls.observances': 'Numără și zilele doar marcate în calendar',
  'controls.observancesHint':
    'Zile precum Ziua Mamei, care sunt marcate în calendar, dar de obicei nu sunt libere.',

  'objective.spread.name': 'Mai multe vacanțe adevărate',
  'objective.spread.hint': 'Vacanțe adevărate, nu un șir de weekenduri prelungite.',
  'objective.longest.name': 'O singură vacanță lungă',
  'objective.longest.hint': 'Pune cea mai mare parte din concediu într-o singură perioadă.',
  'objective.total.name': 'Cât mai multe zile libere, oricât de scurte',
  'objective.total.hint': 'Totalul cel mai mare, mai ales transformând vinerile în weekenduri prelungite.',

  'headline.pickFirst': 'Alege o țară și spune câte zile ai.',
  'headline.noPlan': 'Niciun plan nu se potrivește',
  'headline.beforeYouBook': 'Înainte să ceri ceva',
  'headline.alreadyHave': 'Ai deja {days} {daysOffNoun} în {period}',
  'headline.alreadyHaveDetail':
    'Adică fiecare weekend, plus {holidays} care {falls} într-o zi în care ai fi lucrat, în {country}{birthday}.',
  'headline.falls': { one: 'cade', few: 'cad', other: 'cad' },
  'headline.andYourBirthday': ' și ziua ta de naștere',
  'headline.putAllowance':
    'Pune numărul de zile de concediu în câmpul de mai sus și BridgeDays calculează ce zile să ceri.',
  'headline.answer': 'Răspunsul',
  'headline.becomes': {
    one: '{spent} zi de concediu devine {total} {daysOffNoun}',
    few: '{spent} zile de concediu devin {total} {daysOffNoun}',
    other: '{spent} de zile de concediu devin {total} {daysOffNoun}'
  },
  'headline.inBreaks': 'în {breaks}, de-a lungul lui {period}, pentru {country}.',
  'headline.ratio': '{ratio}× concediul tău',
  'headline.sentence': {
    one: '{leave} devine {off}, în {breaks}',
    few: '{leave} devin {off}, în {breaks}',
    other: '{leave} devin {off}, în {breaks}'
  },
  'headline.ratioSentence': '{ratio} zile libere pentru fiecare zi pe care o ceri',
  'headline.leftOver': {
    one: 'Îți rămâne {count} zi din concediu. Nu mai are unde să fie folosită cu rost în setările astea.',
    few: 'Îți rămân {count} zile din concediu. Nu mai au unde să fie folosite cu rost în setările astea.',
    other: 'Îți rămân {count} de zile din concediu. Nu mai au unde să fie folosite cu rost în setările astea.'
  },
  'headline.givenBack':
    'Include {days} pentru sărbătorile care cad într-o zi în care nu lucrezi. Verifică dacă contractul tău chiar le dă înapoi.',

  'changed.dropped': 'Planul a renunțat la {days}.',
  'changed.movedAndDropped': 'Planul a mutat {added} și a renunțat la {removed}.',
  'meta.titlePlan': '{spent} devin {total} · {period} · BridgeDays',

  'error.holidaysHeading': 'Datele sărbătorilor nu s-au încărcat',
  'error.tryAgain': 'Încearcă din nou',
  'error.missingYears':
    'Încă nu există date despre sărbători pentru {years}. Acele zile sunt numărate ca zile lucrătoare obișnuite, așa că planul va fi prudent.',
  'error.yearsJoin': ' și ',

  'breaks.daysOffFor': '{daysOff}, dacă ceri {cost}.',
  'breaks.perDay': ' Adică {ratio} zile libere pentru fiecare zi pe care o ceri.',
  'breaks.daysToRequest': 'Zile de cerut',
  'breaks.pinnedHere': {
    one: '{count} zi de aici a fost fixată de tine.',
    few: '{count} zile de aici au fost fixate de tine.',
    other: '{count} de zile de aici au fost fixate de tine.'
  },
  'breaks.copy': 'Copiază datele',
  'breaks.copied': 'Copiat',
  'breaks.addToCalendar': 'Adaugă în calendar',

  'request.pill': 'Pune asta în cererea de concediu',
  'request.heading': 'Zile de cerut',
  'request.inPeriod': '{days} în {period}',
  'request.listLabel': 'Toate zilele de cerut, în ordine',
  'request.copyReadable': 'Copiază datele',
  'request.copyIso': 'Copiază ca 2026-06-02',
  'request.copied': 'Copiat',
  'request.hint':
    'Pune oricare dintre ele în cererea de concediu. Al doilea format e cel pe care îl așteaptă majoritatea sistemelor de HR.',

  'year.pill': 'Tot anul',
  'year.heading': '{period} dintr-o privire',
  'year.clearChanges': 'Șterge {changes}',
  'year.tapHint':
    'Apasă pe orice zi lucrătoare ca să o fixezi în plan sau ca să o excluzi. Planul se recalculează în jurul a ce alegi.',
  'year.movedNote': '{note} Zilele care s-au mutat sunt conturate mai jos.',
  'year.whatMarksMean': 'Ce înseamnă semnele',
  'year.prevMonth': 'Arată luna dinainte',
  'year.nextMonth': 'Arată luna următoare',
  'year.weekByWeek': '{month}, săptămână cu săptămână',
  'year.wholeRange': 'Toată perioada',
  'year.monthBar': '{month} {year}, {daysOff} zile libere, {booked} cerute',
  'year.fadedHint':
    'Zilele dinainte și de după {month} sunt estompate, ca o vacanță care trece dintr-o lună în alta să rămână întreagă.',
  'year.movedHere': {
    one: 'O zi care s-a mutat este în ',
    few: '{count} dintre zilele care s-au mutat sunt în ',
    other: '{count} dintre zilele care s-au mutat sunt în '
  },
  'year.listAnd': ' și ',
  'year.outsideMonth': '{label}, în afara acestei luni',

  'daymenu.options': 'Opțiuni pentru {date}',
  'daymenu.alreadyOff': 'Ai deja liber în această zi.',
  'daymenu.pin': 'Ia mereu liber în această zi',
  'daymenu.unpin': 'Nu mai fixa această zi',
  'daymenu.blackout': 'Nu lua niciodată liber în această zi',
  'daymenu.unblackout': 'Permite din nou această zi',

  'day.blackedOut': 'exclusă, nu va fi cerută',
  'day.pinned': 'fixată, ai fixat această zi',
  'day.toBook': 'zi de cerut',
  'day.personalOff': 'zi liberă, {name}',
  'day.publicHoliday': 'sărbătoare legală, {name}',
  'day.notWorking': 'zi nelucrătoare',
  'day.insideBreak': 'în interiorul unei vacanțe',
  'day.normalWorking': 'zi lucrătoare obișnuită',

  'legend.leave': 'Zi de cerut',
  'legend.break': 'În interiorul unei vacanțe',
  'legend.holiday': 'Sărbătoare legală',
  'legend.weekend': 'Zi nelucrătoare',
  'legend.pinned': 'Fixată de tine',
  'legend.blackout': 'Exclusă de tine',

  'curve.pill': 'Nimeni altcineva nu îți arată asta',
  'curve.heading': 'Ce îți aduce fiecare zi de concediu',
  'curve.pointAtBar': 'Arată spre o bară ca să vezi cifrele exacte.',
  'curve.readout': 'Ziua de concediu {day} adaugă {gain}, {total} în total',
  'curve.chartLabel': 'Grafic cu bare. {summary} Aceleași cifre sunt în tabelul de mai jos.',
  'curve.barLabel': 'Ziua de concediu {day} adaugă {gain}, {total} în total',
  'curve.firstDay': 'ziua 1',
  'curve.lastDay': 'ziua {count}',
  'curve.seeNumbers': 'Vezi cifrele',
  'curve.tableCaption': 'Zile libere câștigate pentru fiecare zi de concediu folosită',
  'curve.colLeaveDay': 'Ziua de concediu',
  'curve.colAdds': 'Adaugă',
  'curve.colTotal': 'Total zile libere',
  'curve.notUsed': ' (nefolosită)',
  'curve.everyDayBuys': 'Fiecare zi de concediu îți aduce {days}.',
  'curve.firstThenLater': 'Prima zi îți aduce {first}, iar zilele de după aduc {last}.',
  'curve.firstDayBuys': 'Prima zi îți aduce {days}.',
  'curve.firstDaysBuyEach': 'Primele {span} îți aduc câte {days} fiecare.',
  'curve.lastOneBuys': 'Ultima aduce {days} sau mai puțin.',
  'curve.afterThatRemaining': 'După aceea, restul de {span} aduc {days} sau mai puțin.',

  'share.pill': 'Este al tău',
  'share.heading': 'Ia-l cu tine',
  'share.hint':
    'Tot ce e aici se face pe dispozitivul tău. Nimic nu se încarcă nicăieri, iar linkul funcționează pentru că tot planul e scris în el.',
  'share.copyLink': 'Copiază linkul',
  'share.addBreaks': 'Adaugă vacanțele în calendarul meu',
  'share.addEach': 'Adaugă fiecare zi separat',
  'share.makePicture': 'Fă o imagine',
  'share.hidePicture': 'Ascunde imaginea',
  'share.savePicture': 'Salvează imaginea',
  'share.copyPicture': 'Copiază imaginea',
  'share.copyPost': 'Copiază textul pentru o postare',
  'share.linkCopied': 'Link copiat. Conține tot planul.',
  'share.copyBlocked': 'Browserul nu a lăsat pagina să copieze. Copiază din bara de adrese.',
  'share.textCopied': 'Text copiat.',
  'share.copyBlockedText': 'Browserul nu a lăsat pagina să copieze asta.',
  'share.icsBreaksSaved': 'Fișier de calendar salvat, câte un eveniment pentru fiecare vacanță.',
  'share.icsDaysSaved': 'Fișier de calendar salvat, câte un eveniment pentru fiecare zi cerută.',
  'share.pictureSaved': 'Imagine salvată.',
  'share.pictureCopied': 'Imagine copiată.',

  'verify.pill': 'Nu ne crede pe cuvânt',
  'verify.heading': 'Verifică singur',
  'verify.hint': 'Nu ar trebui să ne crezi pe cuvânt pentru nimic din toate astea. Uite cum poți confirma.',
  'verify.offSiteLabel': 'Cereri către altcineva',
  'verify.countedLive': {
    one: 'Numărate în direct în această pagină. {count} cerere în total, toate către acest site, pentru pagina în sine și pentru datele sărbătorilor.',
    few: 'Numărate în direct în această pagină. {count} cereri în total, toate către acest site, pentru pagina în sine și pentru datele sărbătorilor.',
    other: 'Numărate în direct în această pagină. {count} de cereri în total, toate către acest site, pentru pagina în sine și pentru datele sărbătorilor.'
  },
  'verify.howToCheck':
    'Ca să verifici: deschide uneltele pentru dezvoltatori din browser, du-te la fila Network și reîncarcă pagina. Nimic nu ar trebui să ducă în altă parte decât la acest domeniu.',
  'verify.worksOffline': 'Merge fără conexiune',
  'verify.online': 'Ești online',
  'verify.offline': 'Ești offline și tot funcționează',
  'verify.offlineHint':
    'Oprește-ți wifiul și reîncarcă pagina. Planul se calculează în continuare, pentru că și calculul, și datele sărbătorilor sunt deja pe dispozitivul tău.',
  'verify.howItWorks': 'Cum funcționează',
  'verify.how1': 'Tot calculul rulează în această pagină, pe dispozitivul tău.',
  'verify.how2': 'Datele sărbătorilor vin odată cu aplicația, ca fișiere simple. Nu se caută nimic nicăieri.',
  'verify.how3':
    'Planul tău stă în bara de adrese. De aceea linkul îl reproduce și de aceea nu avem nevoie să stocăm nimic.',
  'verify.how4':
    'Nu există cont, nu există analytics, nu există cookie și nu există urmărire. Nu ai la ce să îți dai acordul.',
  'verify.how5':
    'Singurul lucru care poate fi salvat pe acest dispozitiv este țara ta și numărul de zile, și doar dacă bifezi căsuța care cere asta.',
  'verify.how6':
    'Limba a fost aleasă la marginea rețelei, după țara din care vine conexiunea ta, pe aceeași cerere care a adus pagina. Niciun serviciu de localizare nu a fost întrebat, iar adresa ta nu a fost trimisă nicăieri.',
  'verify.limits': 'Ce nu poate să facă',
  'verify.limit1':
    'Datele sărbătorilor pot fi greșite sau se pot schimba. Guvernele le mută, iar unele sunt anunțate cu doar câteva săptămâni înainte. Verifică într-un calendar oficial orice contează cu adevărat.',
  'verify.limit2':
    'Angajatorul tău are reguli despre care aplicația nu știe nimic: termene de preaviz, perioade în care nu se dă concediu, câți oameni pot lipsi în același timp, dacă poți reporta zile pe anul următor.',
  'verify.limit3': 'Unele contracte scad sărbătorile legale din concediu. Aplicația presupune că nu o fac.',
  'verify.limit4': 'Colegii tăi vor aceleași săptămâni ca tine și cineva trebuie să ceară primul.',
  'verify.limit5': 'Aplicația face aritmetică, nu negociere.',
  'verify.countryNotes': 'Merită știut despre {country}',
  'verify.source': 'Datele sărbătorilor vin din {link}, generate pe {date}. {report}.',
  'verify.reportDate': 'Semnalează o dată greșită',

  'remember.label': 'Ține minte țara și numărul de zile pe acest dispozitiv',
  'remember.hint':
    'Oprit, dacă nu ceri tu altfel. Salvează doar aceste două lucruri în browserul ăsta și nimic altceva: niciun plan, nicio dată, nimic care să plece de pe dispozitiv.',

  'footer.moreApps': 'Mai multe aplicații gratuite pe {brand}',
  'footer.holidaysByCountry': 'Sărbători legale pe țări',
  'footer.licence':
    'BridgeDays este gratuit și open source, sub licența MIT. Datele sărbătorilor vin din proiectul {link} și sunt incluse în aplicație.',
  'footer.source': 'Vezi codul sursă',
  'footer.reportDate': 'Semnalează o dată greșită',
  'footer.contract': 'Verifică-ți contractul înainte să ceri ceva.',

  'showcase.label': 'Celelalte aplicații ale noastre',
  'showcase.close': 'Închide',
  'showcase.show': 'Arată {title}, {n} din {total}',

  'ics.calendarName': 'Concediu',
  'ics.leaveCalendarName': 'Zile de concediu',
  'ics.singleBreakName': 'Concediu, {date}',
  'ics.breakSummary': 'Concediu, {days}',
  'ics.breakDescription': '{off}, folosind {leave}.',
  'ics.perDay': 'Adică {ratio} zile libere pentru fiecare zi cerută.',
  'ics.daysToRequest': 'Zile de cerut:',
  'ics.plannedWith':
    'Planificat cu BridgeDays. Verifică datele în propriul calendar înainte să ceri concediu.',
  'ics.annualLeave': 'Concediu de odihnă',
  'ics.annualLeaveDescription': 'O zi de concediu de odihnă. Planificat cu BridgeDays.',

  'card.perDayBooked': 'ZILE LIBERE PE ZI CERUTĂ',
  'card.daysYouBook': 'zile pe care le ceri',
  'card.daysUnlocked': 'zile pe care le deblochează',
  'card.longest': 'Cea mai lungă: {range}, {days} pentru {cost} cerute',
  'card.tagline': 'Află ce zile de concediu să ceri. Nimic nu pleacă de pe dispozitivul tău.',
  'card.fromLeave': 'din {leave}, în {breaks}',
  'card.imageFailed': 'Imaginea nu a putut fi creată.',
  'card.copyUnsupported':
    'Acest browser nu lasă o pagină să copieze o imagine. Folosește Salvează imaginea.',
  'card.shareLine1': {
    one: '{leave} devine {off} în {period}.',
    few: '{leave} devin {off} în {period}.',
    other: '{leave} devin {off} în {period}.'
  },
  'card.shareLine2': 'Adică {ratio} zile libere pentru fiecare zi pe care o cer.',
  'card.shareBest': 'Cea mai bună: {range}, {off} pentru {cost} cerute.',
  'card.shareFooter': 'Calculat cu BridgeDays pentru {country}.',
  'card.alt':
    '{leave} devin {off} în {period}, pentru {country}, în {breaks}, adică {ratio} zile libere pentru fiecare zi cerută. Câte o bară pentru fiecare lună arată câte zile libere are, împărțite în zilele pe care le ceri și weekendurile și sărbătorile pe care le deblochează.',

  'units.days': { one: '{count} zi', few: '{count} zile', other: '{count} de zile' },
  'units.daysOff': {
    one: '{count} zi liberă',
    few: '{count} zile libere',
    other: '{count} de zile libere'
  },
  'units.leaveDays': {
    one: '{count} zi de concediu',
    few: '{count} zile de concediu',
    other: '{count} de zile de concediu'
  },
  'units.breaks': { one: '{count} vacanță', few: '{count} vacanțe', other: '{count} de vacanțe' },
  'units.changes': {
    one: '{count} modificare',
    few: '{count} modificări',
    other: '{count} de modificări'
  },
  'units.extraDays': {
    one: '{count} zi în plus',
    few: '{count} zile în plus',
    other: '{count} de zile în plus'
  },
  'units.publicHolidays': {
    one: '{count} sărbătoare legală',
    few: '{count} sărbători legale',
    other: '{count} de sărbători legale'
  },

  'units.dayNoun': { one: 'zi', few: 'zile', other: 'de zile' },
  'units.daysOffNoun': { one: 'zi liberă', few: 'zile libere', other: 'de zile libere' },

  'format.rangeSeparator': '-'
}
