import { CATALOG_COPY, type CatalogCopy } from "./i18n-catalog";
import { HOME_COPY, type HomeCopy } from "./i18n-home";
import { CHROME_COPY, type ChromeCopy } from "./i18n-chrome";

export type Language = "sr" | "en";
export type ThemeMode = "light" | "dark";

export type SiteDictionary = {
  nav: {
    brand: string;
    home: string;
    trips: string;
    arrangements: string;
    offers: string;
    religiousTourism: string;
    rentBus: string;
    countries: string;
    about: string;
    contact: string;
    signIn: string;
    signOut: string;
    admin: string;
    language: string;
    theme: string;
    switchToLight: string;
    switchToDark: string;
    openMenu: string;
    closeMenu: string;
    searchPlaceholder: string;
    subExotic: string;
    subEurope: string;
    subCountries: string;
    subAllPackages: string;
    subAllOffers: string;
    subSummer: string;
    subExcursions: string;
    subPilgrimages: string;
    subMonasteries: string;
    heroExotic: string;
    heroEurope: string;
    heroSvetinje: string;
    heroCta1: string;
    heroCta2: string;
  };
  footer: {
    rights: string;
    note: string;
  };
  chrome: ChromeCopy;
  catalog: CatalogCopy;
  homepage: HomeCopy;
  home: {
    badge: string;
    title: string;
    description: string;
    ctaOffers: string;
    ctaContact: string;
    heroPrimaryCta: string;
    heroToolkitLabel: string;
    heroToolkitOffers: string;
    heroToolkitArrangements: string;
    heroToolkitReligious: string;
    portalLabel: string;
    portalTitle: string;
    portalTrips: string;
    portalTripsHint: string;
    portalArrangements: string;
    portalArrangementsHint: string;
    portalReligious: string;
    portalReligiousHint: string;
    metricFounded: string;
    metricFocus: string;
    metricPartners: string;
    pulseBadge: string;
    pulseTitle: string;
    pulseDescription: string;
    pulseCardATitle: string;
    pulseCardADescription: string;
    pulseCardBTitle: string;
    pulseCardBDescription: string;
    pulseCardCTitle: string;
    pulseCardCDescription: string;
    pulseCardDTitle: string;
    pulseCardDDescription: string;
    focusTitle: string;
    focusA: string;
    focusB: string;
    focusC: string;
    modelTitle: string;
    modelDescription: string;
    modelA: string;
    modelB: string;
    modelC: string;
    partnersBadge: string;
    partnersTitle: string;
  };
  about: {
    badge: string;
    title: string;
    intro: string;
    mission: string;
    vision: string;
    valuesTitle: string;
    valueA: string;
    valueB: string;
    valueC: string;
  };
  contact: {
    badge: string;
    title: string;
    description: string;
    formTitle: string;
    infoTitle: string;
    fullName: string;
    email: string;
    phone: string;
    travelType: string;
    travelTypePlaceholder: string;
    travelTypeReligious: string;
    travelTypeSummer: string;
    travelTypeEurope: string;
    travelTypeExcursions: string;
    travelTypeCustom: string;
    travelers: string;
    month: string;
    message: string;
    consent: string;
    submit: string;
    success: string;
    requiredError: string;
    emailError: string;
    officeLabel: string;
    emailLabel: string;
    phoneLabel: string;
    hoursLabel: string;
    detailsPending: string;
  };
  offers: {
    badge: string;
    title: string;
    description: string;
    filterLabel: string;
    filterPlaceholder: string;
    metricSources: string;
    metricConnected: string;
    metricSyncing: string;
    metricLastUpdate: string;
    sourcesTitle: string;
    boardTitle: string;
    noResults: string;
    statusPlanned: string;
    statusConnected: string;
    statusSyncing: string;
    statusPaused: string;
    syncInterval: string;
    lastSync: string;
    departure: string;
    seats: string;
    unknown: string;
    notSynced: string;
    tbd: string;
  };
  trips: {
    badge: string;
    title: string;
    description: string;
    searchLabel: string;
    searchPlaceholder: string;
    openCountry: string;
    noResults: string;
    readyTitle: string;
    readyDescription: string;
  };
  arrangements: {
    badge: string;
    title: string;
    description: string;
    active: string;
    openOffers: string;
    trackA: string;
    trackB: string;
    trackC: string;
    signal: string;
  };
  religious: {
    badge: string;
    title: string;
    description: string;
    searchLabel: string;
    searchPlaceholder: string;
    boardTitle: string;
    viewAllOffers: string;
    noResults: string;
  };
  country: {
    badge: string;
    title: string;
    description: string;
    back: string;
    noOffers: string;
  };
  auth: {
    portalBadge: string;
    portalTitle: string;
    portalDescription: string;
    matrixLabel: string;
    activeSession: string;
    awaitingAccess: string;
    sessionReady: string;
    continueButton: string;
    nextHint: string;
    featureSecurity: string;
    featureExperience: string;
    featureControl: string;
    signInTitle: string;
    signInDescription: string;
    signUpTitle: string;
    signUpDescription: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    showPassword: string;
    hidePassword: string;
    emailHint: string;
    passwordHint: string;
    firstNameTooShort: string;
    lastNameTooShort: string;
    invalidEmail: string;
    passwordTooShort: string;
    passwordMismatch: string;
    requiredFields: string;
    processing: string;
    signInButton: string;
    signUpButton: string;
    noAccount: string;
    hasAccount: string;
    invalidCredentials: string;
    userExists: string;
    signedInAs: string;
    tooManyAttempts: string;
    accountDisabled: string;
    roleOwner: string;
    roleEditor: string;
    roleCustomer: string;
  };
  admin: {
    accessTitle: string;
    accessDescription: string;
    noAccessTitle: string;
    noAccessDescription: string;
    sessionExpired: string;
    signOut: string;
    signingOut: string;
    backToSite: string;
    checkingAccess: string;
    title: string;
    subtitle: string;
    slideTitle: string;
    slideSubtitle: string;
    slideBadge: string;
    slideCopy: string;
    uploadLabel: string;
    order: string;
    active: string;
    save: string;
    noFile: string;
    uploading: string;
    saved: string;
    currentSlides: string;
    signIn: string;
    optional: string;
    categoriesTitle: string;
    categoriesDescription: string;
    categoryNameSr: string;
    categoryNameEn: string;
    categorySlug: string;
    categoryType: string;
    categoryIcon: string;
    categoryOrder: string;
    categoryActive: string;
    categoryItems: string;
    categoryTypeTripLabel: string;
    categoryTypeArrangementLabel: string;
    categoryTypeReligiousLabel: string;
    categoryCreate: string;
    categoryEdit: string;
    categoryDelete: string;
    categoryDeleteConfirm: string;
    categoryNoCategories: string;
    categorySelectPlaceholder: string;
    iconPickerTitle: string;
    iconPickerSearch: string;
    iconPickerNoResults: string;
  };
  settings: {
    title: string;
    description: string;
    workingHours: string;
    address: string;
    phone: string;
    email: string;
    instagramUrl: string;
    save: string;
    saving: string;
    saved: string;
  };
  accommodation: {
    title: string;
    subtitle: string;
    addNew: string;
    editUnit: string;
    name: string;
    type: string;
    description: string;
    pricePerPerson: string;
    currency: string;
    capacity: string;
    capacityUnit: string;
    amenities: string;
    amenitiesPlaceholder: string;
    boardType: string;
    roomInfo: string;
    checkIn: string;
    checkOut: string;
    distanceToCenter: string;
    images: string;
    order: string;
    active: string;
    save: string;
    cancel: string;
    delete: string;
    deleteConfirm: string;
    noUnits: string;
    villa: string;
    apartment: string;
    hotel: string;
    room: string;
    hostel: string;
    other: string;
    ro: string;
    bb: string;
    hb: string;
    fb: string;
    ai: string;
    from: string;
    perPerson: string;
    upTo: string;
    guests: string;
    mealPlan: string;
    viewDetails: string;
    available: string;
    unavailable: string;
  };
  tripDetail: {
    price: string;
    nights: string;
    days: string;
    departure: string;
    returnLabel: string;
    departureCity: string;
    transport: string;
    hotel: string;
    deposit: string;
    depositDeadline: string;
    itinerary: string;
    included: string;
    notIncluded: string;
    contactCta: string;
    back: string;
    featured: string;
    statusActive: string;
    statusUpcoming: string;
    statusCompleted: string;
    bus: string;
    plane: string;
    car: string;
    train: string;
    self: string;
    allTrips: string;
    filterByStatus: string;
    search: string;
    searchPlaceholder: string;
    noTrips: string;
  };
  cart: {
    title: string;
    empty: string;
    addToCart: string;
    removeItem: string;
    clearCart: string;
    checkout: string;
    total: string;
    item: string;
    items: string;
    added: string;
    standbyMessage: string;
    orderRecorded: string;
    close: string;
  };
};

export const DICTIONARY: Record<Language, SiteDictionary> = {
  sr: {
    nav: {
      brand: "ABLux Travel",
      home: "Početna",
      trips: "Putovanja",
      arrangements: "Aranžmani",
      offers: "Ponude",
      religiousTourism: "Verski turizam",
      rentBus: "Rent a bus",
      countries: "Destinacije",
      about: "O nama",
      contact: "Kontakt",
      signIn: "Prijava",
      signOut: "Odjava",
      admin: "Admin",
      language: "Jezik",
      theme: "Tema",
      switchToLight: "Svetla",
      switchToDark: "Tamna",
      openMenu: "Otvori meni",
      closeMenu: "Zatvori meni",
      searchPlaceholder: "Pretraži ponude i destinacije...",
      subExotic: "Egzotična putovanja",
      subEurope: "Evropske metropole",
      subCountries: "Sve destinacije",
      subAllPackages: "Svi aranžmani",
      subAllOffers: "Sve ponude",
      subSummer: "Letovanja",
      subExcursions: "Ekskurzije",
      subPilgrimages: "Hodočašća",
      subMonasteries: "Manastiri",
      heroExotic: "EGZOTIČNA PUTOVANJA",
      heroEurope: "EVROPSKE METROPOLE",
      heroSvetinje: "SRPSKE SVETINJE",
      heroCta1: "Istražite destinacije",
      heroCta2: "Verska putovanja u Srbiji",
    },
    footer: {
      rights: "Sva prava zadržana.",
      note: "Verski turizam, letovanja, evropske ture i ekskurzije za decu.",
    },
    chrome: CHROME_COPY.sr,
    catalog: CATALOG_COPY.sr,
    homepage: HOME_COPY.sr,
    home: {
      badge: "Turistička agencija od 2022.",
      title: "Pouzdana putovanja osmišljena do detalja.",
      description:
        "ABLux Travel je osnovan sa jasnom vizijom: da svako putovanje bude sigurno, sadržajno i nezaboravno iskustvo. Poseban fokus stavljamo na verski turizam, uz pažljivo izabrana letovanja, evropske gradove i ekskurzije za decu.",
      ctaOffers: "Pregledaj kompletnu ponudu",
      ctaContact: "Pošalji upit",
      heroPrimaryCta: "Putuj",
      heroToolkitLabel: "Brzi izbor putovanja",
      heroToolkitOffers: "Kompletna ponuda",
      heroToolkitArrangements: "Aranžmani",
      heroToolkitReligious: "Verski turizam",
      portalLabel: "Brzi pristup",
      portalTitle: "Izaberi pravac putovanja",
      portalTrips: "Putovanja",
      portalTripsHint: "Otvorite zemlje i destinacije sa aktivnim ponudama.",
      portalArrangements: "Aranžmani",
      portalArrangementsHint: "Premium programi sa video pregledom i jasnim terminima.",
      portalReligious: "Verski turizam",
      portalReligiousHint: "Hodočašća i sveta mesta sa potpuno organizovanim rutama.",
      metricFounded: "Godina osnivanja: 2022",
      metricFocus: "Specijalizacija: verski turizam",
      metricPartners: "Planirano 15+ partnerskih agencija",
      pulseBadge: "Zašto putnici biraju ABLux",
      pulseTitle: "4 razloga zašto putnici biraju ABLux",
      pulseDescription:
        "Od prve ideje do povratka sa putovanja, svaki korak je optimizovan za jasnoću, brzinu i osećaj potpune kontrole.",
      pulseCardATitle: "Pažljivo planirane rute",
      pulseCardADescription:
        "Verske i premium destinacije biramo po kvalitetu programa, ritmu putovanja i reputaciji lokalnih partnera.",
      pulseCardBTitle: "Bezbednost na prvom mestu",
      pulseCardBDescription:
        "Plan puta, ključne informacije i logistika grupe ostaju sinhronizovani kako bi putnici imali sigurno iskustvo.",
      pulseCardCTitle: "Jasne cene i termini",
      pulseCardCDescription:
        "Transparentno prikazujemo raspoloživost, uslove i dinamiku putovanja bez skrivenih koraka ili konfuzije.",
      pulseCardDTitle: "Podrška koja odgovara odmah",
      pulseCardDDescription:
        "Tim je dostupan pre, tokom i nakon putovanja uz personalizovane predloge prilagođene vašoj grupi.",
      focusTitle: "Na šta stavljamo akcenat",
      focusA: "Verska putovanja sa pažljivo planiranim rutama i pouzdanom organizacijom.",
      focusB: "Letovanja i gradske ture prilagođene različitim budžetima i ritmu putovanja.",
      focusC: "Ekskurzije za decu sa visokim standardima bezbednosti i sadržaja.",
      modelTitle: "Jedna platforma za kompletnu prodaju",
      modelDescription:
        "Na jednom mestu predstavljamo aktivne programe i ponude, uz jasne informacije, brzu pretragu i iskustvo koje putniku uliva sigurnost.",
      modelA: "Vaši aranžmani i putovanja na jednom mestu",
      modelB: "Agregacija ponuda drugih agencija uz provizijsku prodaju",
      modelC: "Brza i transparentna odluka pri izboru putovanja",
      partnersBadge: "Saradnici",
      partnersTitle: "Agencije kojima verujemo",
    },
    about: {
      badge: "Ko smo mi",
      title: "ABLux Travel gradi ozbiljan i dugoročan turizam.",
      intro:
        "ABLux Travel je turistička agencija osnovana 2022. godine sa jasnom vizijom da putnicima pruži kvalitetna, pažljivo osmišljena i pouzdana putovanja.",
      mission:
        "Poseban akcenat od samog početka stavljamo na verski turizam, uz bogatu ponudu letovanja, putovanja u evropske gradove i organizaciju ekskurzija za decu.",
      vision:
        "Naš tim posvećeno radi na tome da svako putovanje bude sigurno, sadržajno i nezaboravno iskustvo.",
      valuesTitle: "Vrednosti koje pratimo",
      valueA: "Pouzdanost i transparentna komunikacija sa putnicima.",
      valueB: "Kvalitet programa i pažljivo planirana logistika.",
      valueC: "Stalno unapređenje ponude kroz partnerstva i digitalizaciju.",
    },
    contact: {
      badge: "Kontakt i upiti",
      title: "Pošaljite upit za putovanje",
      description:
        "Popunite formu i naš tim će vam poslati personalizovan predlog putovanja sa tačnim detaljima i cenom.",
      formTitle: "Forma za upit",
      infoTitle: "Kontakt informacije",
      fullName: "Ime i prezime",
      email: "Adresa e-pošte",
      phone: "Telefon",
      travelType: "Tip putovanja",
      travelTypePlaceholder: "Izaberite tip putovanja",
      travelTypeReligious: "Verski turizam",
      travelTypeSummer: "Letovanje",
      travelTypeEurope: "Evropski gradovi",
      travelTypeExcursions: "Ekskurzije za decu",
      travelTypeCustom: "Poseban zahtev",
      travelers: "Broj putnika",
      month: "Planirani mesec putovanja",
      message: "Opis upita",
      consent: "Saglasan/na sam da me kontaktirate u vezi sa ovim upitom.",
      submit: "Pošalji upit",
      success: "Hvala. Upit je uspešno poslat. Naš tim vam se javlja u najkraćem roku.",
      requiredError: "Popunite obavezna polja i označite saglasnost.",
      emailError: "Unesite ispravnu email adresu.",
      officeLabel: "Adresa",
      emailLabel: "E-pošta",
      phoneLabel: "Telefon",
      hoursLabel: "Radno vreme",
      detailsPending: "Kontakt podaci uskoro",
    },
    offers: {
      badge: "Aktivne ponude",
      title: "Ponude spremne za poređenje",
      description:
        "Uporedite konkretne ponude po destinaciji, terminu, polasku i ceni, pa brzo izaberite opciju koja odgovara vašem planu.",
      filterLabel: "Filter po destinaciji",
      filterPlaceholder: "Na primer: Rim",
      metricSources: "Izvori",
      metricConnected: "Povezani izvori",
      metricSyncing: "Sinhronizacija u toku",
      metricLastUpdate: "Poslednje osvežavanje",
      sourcesTitle: "Status izvora podataka",
      boardTitle: "Aktivne ponude",
      noResults: "Nema ponuda za trenutni filter.",
      statusPlanned: "Planirano",
      statusConnected: "Povezano",
      statusSyncing: "Sinhronizuje se",
      statusPaused: "Pauzirano",
      syncInterval: "Interval sinhronizacije",
      lastSync: "Poslednja sinhronizacija",
      departure: "Polazak",
      seats: "Slobodna mesta",
      unknown: "Nepoznato",
      notSynced: "Nije sinhronizovano",
      tbd: "U pripremi",
    },
    trips: {
      badge: "Destinacije",
      title: "Putovanja i zemlje",
      description:
        "Izaberite destinaciju i otvorite sve ponude koje su trenutno aktivne za tu zemlju.",
      searchLabel: "Pretraga destinacija",
      searchPlaceholder: "Upišite zemlju ili opis",
      openCountry: "Pogledaj ponude",
      noResults: "Nema rezultata za uneti pojam.",
      readyTitle: "Spremno za proširenje",
      readyDescription:
        "Svaka destinacija je predstavljena jasno i pregledno, tako da putnik odmah vidi šta je dostupno i kako da nastavi ka rezervaciji.",
    },
    arrangements: {
      badge: "Istaknuti aranžmani",
      title: "Aranžmani sa jasnim programom i destinacijama",
      description:
        "Izaberite okvir putovanja, pregledajte destinacije unutar aranžmana i nastavite ka ponudi koja vam najviše odgovara.",
      active: "Aktivni aranžman",
      openOffers: "Idi na kompletnu ponudu",
      trackA: "Kvalitet programa",
      trackB: "Pouzdana organizacija",
      trackC: "Jasne cene i termini",
      signal: "Aranžman",
    },
    religious: {
      badge: "Verski turizam",
      title: "Ponude za hodočašća i svete destinacije",
      description:
        "Posebno izdvojene ponude za verski turizam. Prikazujemo aranžmane koji uključuju hodočašća, manastire, svetinje i duhovna putovanja.",
      searchLabel: "Pretraga verskih ponuda",
      searchPlaceholder: "Na primer: Ostrog, Jerusalim, manastiri",
      boardTitle: "Aktivne verske ponude",
      viewAllOffers: "Pogledaj kompletnu ponudu",
      noResults: "Trenutno nema verskih ponuda za uneti pojam.",
    },
    country: {
      badge: "Ponude po zemlji",
      title: "Aktivne ponude za",
      description: "Filtrirani pregled svih dostupnih putovanja za izabranu zemlju.",
      back: "Nazad na putovanja",
      noOffers: "Trenutno nema aktivnih ponuda za ovu destinaciju.",
    },
    auth: {
      portalBadge: "ABLux korisnički portal",
      portalTitle: "Brzi pristup vašim putovanjima.",
      portalDescription:
        "Prijavite se ili otvorite nalog i lako pratite ponude, planove putovanja i brzu komunikaciju sa našim timom.",
      matrixLabel: "Status naloga",
      activeSession: "Aktivna sesija",
      awaitingAccess: "Čeka autentifikaciju",
      sessionReady: "Sesija je spremna za nastavak.",
      continueButton: "Nastavi",
      nextHint: "Po završetku bićeš preusmeren/a na traženu stranicu.",
      featureSecurity: "Jednostavna i bezbedna prijava sa jasnim koracima.",
      featureExperience: "Brz pristup najtraženijim destinacijama i aktuelnim ponudama.",
      featureControl: "Laka komunikacija sa agencijom i pregled podataka na jednom mestu.",
      signInTitle: "Prijava",
      signInDescription: "Pristup korisničkom nalogu.",
      signUpTitle: "Registracija",
      signUpDescription: "Kreirajte nalog i sačuvajte omiljena putovanja.",
      firstName: "Ime",
      lastName: "Prezime",
      email: "E-pošta",
      password: "Lozinka",
      confirmPassword: "Potvrdi lozinku",
      showPassword: "Prikaži lozinku",
      hidePassword: "Sakrij lozinku",
      emailHint: "Unesite važeću email adresu.",
      passwordHint: "Nova lozinka mora imati najmanje 8 karaktera.",
      firstNameTooShort: "Ime mora imati najmanje 2 karaktera.",
      lastNameTooShort: "Prezime mora imati najmanje 2 karaktera.",
      invalidEmail: "Unesite ispravan email.",
      passwordTooShort: "Lozinka mora imati najmanje 8 karaktera.",
      passwordMismatch: "Lozinke se ne poklapaju.",
      requiredFields: "Popunite sva obavezna polja.",
      processing: "Obrada u toku...",
      signInButton: "Prijavi se",
      signUpButton: "Kreiraj nalog",
      noAccount: "Nemate nalog?",
      hasAccount: "Već imate nalog?",
      invalidCredentials: "Pogrešan email ili lozinka.",
      userExists: "Korisnik sa ovim emailom već postoji.",
      signedInAs: "Prijavljeni ste kao",
      tooManyAttempts: "Previše neuspešnih pokušaja. Sačekajte nekoliko minuta pa pokušajte ponovo.",
      accountDisabled: "Nalog je isključen. Obratite se agenciji.",
      roleOwner: "Vlasnik",
      roleEditor: "Urednik",
      roleCustomer: "Korisnik",
    },
    admin: {
      accessTitle: "Admin pristup",
      accessDescription: "Pristup imaju samo vlasnik i urednici agencije. Prijavite se svojim nalogom.",
      noAccessTitle: "Nemate pristup administraciji",
      noAccessDescription: "Vaš nalog nema ulogu urednika. Ako radite u agenciji, zamolite vlasnika da Vam dodeli ulogu.",
      sessionExpired: "Sesija je istekla. Prijavite se ponovo.",
      signOut: "Odjavi se",
      signingOut: "Odjavljivanje…",
      backToSite: "Nazad na sajt",
      checkingAccess: "Proveravamo pristup…",
      title: "Admin panel",
      subtitle: "Dodavanje i uređivanje video slajdova za prikaz aranžmana i putovanja.",
      slideTitle: "Naslov",
      slideSubtitle: "Podnaslov",
      slideBadge: "Oznaka",
      slideCopy: "Opis",
      uploadLabel: "MP4 fajl",
      order: "Redosled",
      active: "Aktivno",
      save: "Sačuvaj slajd",
      noFile: "Izaberite MP4 fajl.",
      uploading: "Otpremanje u toku...",
      saved: "Slajd je sačuvan.",
      currentSlides: "Trenutni slajdovi",
      signIn: "Prijava",
      optional: "Opciono",
      categoriesTitle: "Kategorije",
      categoriesDescription: "Upravljanje kategorijama za navigaciju i filtriranje ponuda.",
      categoryNameSr: "Naziv (SR)",
      categoryNameEn: "Naziv (EN)",
      categorySlug: "Slug (URL)",
      categoryType: "Tip",
      categoryIcon: "Ikonica",
      categoryOrder: "Redosled",
      categoryActive: "Aktivna",
      categoryItems: "stavki",
      categoryTypeTripLabel: "Putovanje",
      categoryTypeArrangementLabel: "Aranžman",
      categoryTypeReligiousLabel: "Verski turizam",
      categoryCreate: "Dodaj kategoriju",
      categoryEdit: "Izmeni",
      categoryDelete: "Obriši",
      categoryDeleteConfirm: "Da li ste sigurni da želite da obrišete ovu kategoriju?",
      categoryNoCategories: "Nema kategorija. Kreirajte prvu.",
      categorySelectPlaceholder: "Izaberite kategoriju",
      iconPickerTitle: "Izaberite ikonicu",
      iconPickerSearch: "Pretražite ikonice...",
      iconPickerNoResults: "Nema rezultata",
    },
    settings: {
      title: "Podešavanja sajta",
      description: "Radno vreme, kontakt podaci i društvene mreže.",
      workingHours: "Radno vreme",
      address: "Adresa",
      phone: "Telefon",
      email: "E-pošta",
      instagramUrl: "Instagram URL",
      save: "Sačuvaj",
      saving: "Čuvanje...",
      saved: "Podešavanja su sačuvana.",
    },
    accommodation: {
      title: "Smeštaj",
      subtitle: "Dostupne opcije smeštaja za ovaj aranžman",
      addNew: "Dodaj smeštaj",
      editUnit: "Izmeni smeštaj",
      name: "Naziv",
      type: "Tip smeštaja",
      description: "Opis",
      pricePerPerson: "Cena po osobi",
      currency: "Valuta",
      capacity: "Kapacitet",
      capacityUnit: "osoba",
      amenities: "Pogodnosti",
      amenitiesPlaceholder: "WiFi, bazen, parking, klima... (svaka u novom redu)",
      boardType: "Tip ishrane",
      roomInfo: "Info o sobi",
      checkIn: "Check-in",
      checkOut: "Check-out",
      distanceToCenter: "Udaljenost od centra",
      images: "Slike smeštaja",
      order: "Redosled",
      active: "Aktivno",
      save: "Sačuvaj smeštaj",
      cancel: "Otkaži",
      delete: "Obriši",
      deleteConfirm: "Obrisati ovaj smeštaj?",
      noUnits: "Nema dodatog smeštaja za ovaj aranžman.",
      villa: "Vila",
      apartment: "Apartman",
      hotel: "Hotel",
      room: "Soba",
      hostel: "Hostel",
      other: "Ostalo",
      ro: "Samo smeštaj",
      bb: "Noćenje sa doručkom",
      hb: "Polupansion",
      fb: "Pun pansion",
      ai: "All inclusive",
      from: "od",
      perPerson: "po osobi",
      upTo: "do",
      guests: "gostiju",
      mealPlan: "Ishrana",
      viewDetails: "Pogledaj detalje",
      available: "Dostupno",
      unavailable: "Nedostupno",
    },
    tripDetail: {
      price: "Cena",
      nights: "Noćenja",
      days: "Dana",
      departure: "Polazak",
      returnLabel: "Povratak",
      departureCity: "Grad polaska",
      transport: "Prevoz",
      hotel: "Hotel",
      deposit: "Depozit",
      depositDeadline: "Rok za uplatu",
      itinerary: "Program",
      included: "Uključeno u cenu",
      notIncluded: "Nije uključeno",
      contactCta: "Pošalji upit za ovaj aranžman",
      back: "Nazad na aranžmane",
      featured: "Istaknuto",
      statusActive: "Aktivan",
      statusUpcoming: "Uskoro",
      statusCompleted: "Završen",
      bus: "Autobus",
      plane: "Avion",
      car: "Automobil",
      train: "Voz",
      self: "Sopstveni prevoz",
      allTrips: "Svi aranžmani",
      filterByStatus: "Filtriraj po statusu",
      search: "Pretraga",
      searchPlaceholder: "Pretraži aranžmane...",
      noTrips: "Trenutno nema dostupnih aranžmana.",
    },
    cart: {
      title: "Korpa",
      empty: "Vaša korpa je prazna.",
      addToCart: "Dodaj u korpu",
      removeItem: "Ukloni",
      clearCart: "Isprazni korpu",
      checkout: "Završi porudžbinu",
      total: "Ukupno",
      item: "stavka",
      items: "stavki",
      added: "Dodato u korpu",
      standbyMessage:
        "Trenutno plaćanje nije omogućeno. Vaša porudžbina je zabeležena i stiže Vam na email.",
      orderRecorded: "Porudžbina je zabeležena.",
      close: "Zatvori",
    },
  },
  en: {
    nav: {
      brand: "ABLux Travel",
      home: "Home",
      trips: "Trips",
      arrangements: "Packages",
      offers: "Offers",
      religiousTourism: "Religious Tourism",
      rentBus: "Rent a bus",
      countries: "Destinations",
      about: "About",
      contact: "Contact",
      signIn: "Sign In",
      signOut: "Sign Out",
      admin: "Admin",
      language: "Language",
      theme: "Theme",
      switchToLight: "Light",
      switchToDark: "Dark",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      searchPlaceholder: "Search offers and destinations...",
      subExotic: "Exotic Trips",
      subEurope: "European Cities",
      subCountries: "All Destinations",
      subAllPackages: "All Packages",
      subAllOffers: "All Offers",
      subSummer: "Summer Vacations",
      subExcursions: "Excursions",
      subPilgrimages: "Pilgrimages",
      subMonasteries: "Monasteries",
      heroExotic: "EXOTIC TRIPS",
      heroEurope: "EUROPEAN CITIES",
      heroSvetinje: "SERBIAN SANCTUARIES",
      heroCta1: "Explore Destinations",
      heroCta2: "Religious Travel in Serbia",
    },
    footer: {
      rights: "All rights reserved.",
      note: "Religious tourism, summer vacations, European city tours, and school excursions.",
    },
    chrome: CHROME_COPY.en,
    catalog: CATALOG_COPY.en,
    homepage: HOME_COPY.en,
    home: {
      badge: "Travel agency established in 2022",
      title: "Reliable trips designed with care.",
      description:
        "ABLux Travel was founded with a clear vision: to provide high-quality, carefully planned, and dependable travel experiences. Our main focus is religious tourism, supported by summer programs, European city breaks, and excursions for children.",
      ctaOffers: "Browse full offer",
      ctaContact: "Send inquiry",
      heroPrimaryCta: "Travel",
      heroToolkitLabel: "Quick travel menu",
      heroToolkitOffers: "Complete Offer",
      heroToolkitArrangements: "Packages",
      heroToolkitReligious: "Religious Tourism",
      portalLabel: "Quick access",
      portalTitle: "Choose your travel direction",
      portalTrips: "Trips",
      portalTripsHint: "Open countries and destinations with active offers.",
      portalArrangements: "Packages",
      portalArrangementsHint: "Premium programs with immersive video previews.",
      portalReligious: "Religious Tourism",
      portalReligiousHint: "Pilgrimages and sacred routes with full organization.",
      metricFounded: "Founded: 2022",
      metricFocus: "Core focus: religious tourism",
      metricPartners: "Planned 15+ partner agencies",
      pulseBadge: "Why travelers choose ABLux",
      pulseTitle: "4 reasons travelers choose ABLux",
      pulseDescription:
        "From first idea to return journey, every step is optimized for clarity, speed, and full traveler confidence.",
      pulseCardATitle: "Carefully planned routes",
      pulseCardADescription:
        "Religious and premium destinations are selected by program quality, travel rhythm, and trusted local partners.",
      pulseCardBTitle: "Safety first",
      pulseCardBDescription:
        "Routes, live trip details, and group logistics stay synchronized to keep every traveler secure and informed.",
      pulseCardCTitle: "Clear prices and timelines",
      pulseCardCDescription:
        "Availability, conditions, and trip tempo are presented transparently without hidden steps or information noise.",
      pulseCardDTitle: "Support with instant response",
      pulseCardDDescription:
        "Our team stays available before, during, and after the trip with guidance tailored to your specific group.",
      focusTitle: "What we focus on",
      focusA: "Religious journeys with carefully planned routes and reliable logistics.",
      focusB: "Summer and city tours adapted to different budgets and travel styles.",
      focusC: "Children excursions with strong safety and content standards.",
      modelTitle: "One platform for complete sales",
      modelDescription:
        "A single, high-conversion hub for active packages and offers, designed for clarity, trust, and fast traveler decisions.",
      modelA: "Your own trips and packages in one place",
      modelB: "Aggregated offers with commission-based sales",
      modelC: "Fast and transparent traveler decision flow",
      partnersBadge: "Partners",
      partnersTitle: "Agencies we trust",
    },
    about: {
      badge: "Who we are",
      title: "ABLux Travel builds serious and long-term tourism services.",
      intro:
        "ABLux Travel is a travel agency founded in 2022 with a clear vision to provide quality, carefully designed, and reliable travel.",
      mission:
        "From day one, we have placed special emphasis on religious tourism, while also offering summer vacations, European city trips, and excursions for children.",
      vision:
        "Our team is fully committed to making every trip safe, meaningful, and memorable.",
      valuesTitle: "Our values",
      valueA: "Reliability and transparent communication with travelers.",
      valueB: "High program quality and carefully planned logistics.",
      valueC: "Continuous growth through partnerships and digitalization.",
    },
    contact: {
      badge: "Contact and inquiries",
      title: "Send a travel inquiry",
      description:
        "Fill in the form and our team will prepare a personalized travel proposal with full details and pricing.",
      formTitle: "Inquiry form",
      infoTitle: "Contact details",
      fullName: "Full name",
      email: "Email",
      phone: "Phone",
      travelType: "Travel type",
      travelTypePlaceholder: "Choose travel type",
      travelTypeReligious: "Religious tourism",
      travelTypeSummer: "Summer vacation",
      travelTypeEurope: "European cities",
      travelTypeExcursions: "Children excursions",
      travelTypeCustom: "Custom request",
      travelers: "Number of travelers",
      month: "Planned travel month",
      message: "Inquiry details",
      consent: "I agree to be contacted regarding this inquiry.",
      submit: "Send inquiry",
      success: "Thank you. Your inquiry has been sent successfully. Our team will contact you shortly.",
      requiredError: "Please fill all required fields and accept consent.",
      emailError: "Please enter a valid email address.",
      officeLabel: "Address",
      emailLabel: "Email",
      phoneLabel: "Phone",
      hoursLabel: "Working hours",
      detailsPending: "Contact details coming soon",
    },
    offers: {
      badge: "Active offers",
      title: "Offers ready to compare",
      description:
        "Compare concrete offers by destination, date, departure point, and price, then choose the option that fits your plan.",
      filterLabel: "Destination filter",
      filterPlaceholder: "Example: Rome",
      metricSources: "Sources",
      metricConnected: "Connected",
      metricSyncing: "Syncing",
      metricLastUpdate: "Last update",
      sourcesTitle: "Data source status",
      boardTitle: "Active offers",
      noResults: "No offers found for the current filter.",
      statusPlanned: "Planned",
      statusConnected: "Connected",
      statusSyncing: "Syncing",
      statusPaused: "Paused",
      syncInterval: "Sync interval",
      lastSync: "Last sync",
      departure: "Departure",
      seats: "Seats left",
      unknown: "Unknown",
      notSynced: "Not synced",
      tbd: "TBD",
    },
    trips: {
      badge: "Destinations",
      title: "Trips and countries",
      description:
        "Choose a destination and open all offers currently active for that country.",
      searchLabel: "Search destinations",
      searchPlaceholder: "Type country or keyword",
      openCountry: "View offers",
      noResults: "No matches for your search.",
      readyTitle: "Ready to scale",
      readyDescription:
        "Each destination is presented in a clear conversion flow so visitors can quickly discover options and continue toward booking.",
    },
    arrangements: {
      badge: "Featured packages",
      title: "Packages with clear programs and destinations",
      description:
        "Choose the travel framework, review the destinations inside the package, and continue to the offer that fits best.",
      active: "Active package",
      openOffers: "Open full offer",
      trackA: "Program quality",
      trackB: "Reliable organization",
      trackC: "Clear pricing and dates",
      signal: "Package",
    },
    religious: {
      badge: "Religious tourism",
      title: "Pilgrimage and sacred destination offers",
      description:
        "A dedicated board for religious tourism offers. We highlight pilgrimages, monasteries, holy places, and spiritually focused trips.",
      searchLabel: "Search religious offers",
      searchPlaceholder: "Example: Jerusalem, Sinai, monastery",
      boardTitle: "Active religious offers",
      viewAllOffers: "Open complete offer",
      noResults: "No religious offers found for the current search.",
    },
    country: {
      badge: "Country offers",
      title: "Active offers for",
      description: "Filtered overview of all available trips for the selected country.",
      back: "Back to trips",
      noOffers: "There are currently no active offers for this destination.",
    },
    auth: {
      portalBadge: "ABLux Client Portal",
      portalTitle: "Fast access to your next trip.",
      portalDescription:
        "Sign in or create your account to track offers, plan your journey, and stay connected with our travel team.",
      matrixLabel: "Account status",
      activeSession: "Active session",
      awaitingAccess: "Awaiting authentication",
      sessionReady: "Session is ready to continue.",
      continueButton: "Continue",
      nextHint: "After auth you will be redirected to the requested page.",
      featureSecurity: "Simple and secure sign in with clear steps.",
      featureExperience: "Quick access to featured destinations and active offers.",
      featureControl: "Easy communication with our team and your details in one place.",
      signInTitle: "Sign In",
      signInDescription: "Access your account.",
      signUpTitle: "Sign Up",
      signUpDescription: "Create an account and save your favorite trips.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      emailHint: "Enter a valid email address.",
      passwordHint: "A new password needs at least 8 characters.",
      firstNameTooShort: "First name must be at least 2 characters.",
      lastNameTooShort: "Last name must be at least 2 characters.",
      invalidEmail: "Please enter a valid email.",
      passwordTooShort: "Password must be at least 8 characters.",
      passwordMismatch: "Passwords do not match.",
      requiredFields: "Please fill all required fields.",
      processing: "Processing...",
      signInButton: "Sign In",
      signUpButton: "Create account",
      noAccount: "No account yet?",
      hasAccount: "Already have an account?",
      invalidCredentials: "Invalid email or password.",
      userExists: "A user with this email already exists.",
      signedInAs: "Signed in user",
      tooManyAttempts: "Too many failed attempts. Please wait a few minutes and try again.",
      accountDisabled: "This account is disabled. Please contact the agency.",
      roleOwner: "Owner",
      roleEditor: "Editor",
      roleCustomer: "Customer",
    },
    admin: {
      accessTitle: "Admin access",
      accessDescription: "Only the agency owner and editors can access this area. Please sign in.",
      noAccessTitle: "No access to administration",
      noAccessDescription: "Your account does not have the editor role. If you work at the agency, ask the owner to assign it.",
      sessionExpired: "Your session has expired. Please sign in again.",
      signOut: "Sign out",
      signingOut: "Signing out…",
      backToSite: "Back to the site",
      checkingAccess: "Checking access…",
      title: "Admin panel",
      subtitle: "Upload and manage video slides used across packages and trips.",
      slideTitle: "Title",
      slideSubtitle: "Subtitle",
      slideBadge: "Badge",
      slideCopy: "Description",
      uploadLabel: "MP4 file",
      order: "Order",
      active: "Active",
      save: "Save slide",
      noFile: "Please choose an MP4 file.",
      uploading: "Uploading...",
      saved: "Slide saved.",
      currentSlides: "Current slides",
      signIn: "Sign In",
      optional: "Optional",
      categoriesTitle: "Categories",
      categoriesDescription: "Manage categories for navigation and offer filtering.",
      categoryNameSr: "Name (SR)",
      categoryNameEn: "Name (EN)",
      categorySlug: "Slug (URL)",
      categoryType: "Type",
      categoryIcon: "Icon",
      categoryOrder: "Order",
      categoryActive: "Active",
      categoryItems: "items",
      categoryTypeTripLabel: "Trip",
      categoryTypeArrangementLabel: "Arrangement",
      categoryTypeReligiousLabel: "Religious tourism",
      categoryCreate: "Add category",
      categoryEdit: "Edit",
      categoryDelete: "Delete",
      categoryDeleteConfirm: "Are you sure you want to delete this category?",
      categoryNoCategories: "No categories yet. Create the first one.",
      categorySelectPlaceholder: "Select category",
      iconPickerTitle: "Choose an icon",
      iconPickerSearch: "Search icons...",
      iconPickerNoResults: "No results",
    },
    settings: {
      title: "Site Settings",
      description: "Working hours, contact info, and social media.",
      workingHours: "Working hours",
      address: "Address",
      phone: "Phone",
      email: "Email",
      instagramUrl: "Instagram URL",
      save: "Save",
      saving: "Saving...",
      saved: "Settings saved.",
    },
    accommodation: {
      title: "Accommodation",
      subtitle: "Available accommodation options for this package",
      addNew: "Add accommodation",
      editUnit: "Edit accommodation",
      name: "Name",
      type: "Accommodation type",
      description: "Description",
      pricePerPerson: "Price per person",
      currency: "Currency",
      capacity: "Capacity",
      capacityUnit: "guests",
      amenities: "Amenities",
      amenitiesPlaceholder: "WiFi, pool, parking, AC... (one per line)",
      boardType: "Board type",
      roomInfo: "Room info",
      checkIn: "Check-in",
      checkOut: "Check-out",
      distanceToCenter: "Distance to center",
      images: "Accommodation images",
      order: "Order",
      active: "Active",
      save: "Save accommodation",
      cancel: "Cancel",
      delete: "Delete",
      deleteConfirm: "Delete this accommodation?",
      noUnits: "No accommodations added for this package.",
      villa: "Villa",
      apartment: "Apartment",
      hotel: "Hotel",
      room: "Room",
      hostel: "Hostel",
      other: "Other",
      ro: "Room only",
      bb: "Bed & breakfast",
      hb: "Half board",
      fb: "Full board",
      ai: "All inclusive",
      from: "from",
      perPerson: "per person",
      upTo: "up to",
      guests: "guests",
      mealPlan: "Meal plan",
      viewDetails: "View details",
      available: "Available",
      unavailable: "Unavailable",
    },
    tripDetail: {
      price: "Price",
      nights: "Nights",
      days: "Days",
      departure: "Departure",
      returnLabel: "Return",
      departureCity: "Departure city",
      transport: "Transport",
      hotel: "Hotel",
      deposit: "Deposit",
      depositDeadline: "Deposit deadline",
      itinerary: "Itinerary",
      included: "Included",
      notIncluded: "Not included",
      contactCta: "Send inquiry for this trip",
      back: "Back to packages",
      featured: "Featured",
      statusActive: "Active",
      statusUpcoming: "Upcoming",
      statusCompleted: "Completed",
      bus: "Bus",
      plane: "Plane",
      car: "Car",
      train: "Train",
      self: "Own transport",
      allTrips: "All packages",
      filterByStatus: "Filter by status",
      search: "Search",
      searchPlaceholder: "Search packages...",
      noTrips: "No packages available at the moment.",
    },
    cart: {
      title: "Cart",
      empty: "Your cart is empty.",
      addToCart: "Add to cart",
      removeItem: "Remove",
      clearCart: "Clear cart",
      checkout: "Checkout",
      total: "Total",
      item: "item",
      items: "items",
      added: "Added to cart",
      standbyMessage:
        "Online payment is not currently available. Your order has been recorded and will be sent to your email.",
      orderRecorded: "Order recorded.",
      close: "Close",
    },
  },
};
