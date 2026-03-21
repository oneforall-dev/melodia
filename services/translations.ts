
export type LanguageCode = 'English' | 'Spanish' | 'Korean' | 'Japanese';

export const detectLanguage = (): LanguageCode => {
  if (typeof navigator === 'undefined') return 'English';
  const lang = navigator.language.split('-')[0];
  if (lang === 'es') return 'Spanish';
  if (lang === 'ko') return 'Korean';
  if (lang === 'ja') return 'Japanese';
  return 'English';
};

export const translations = {
  English: {
    common: {
      all: "All",
      global: "Global"
    },
    landing: {
      heroTitle: "The Billboard of AI Music",
      heroDesc: "The world's best exclusive chart for AI-generated music. Discover, vote, and rank the algorithmic hits of tomorrow.",
      enterBtn: "Enter the Charts",
      whyTitle: "Why Melodia?",
      reason1Title: "AI Exclusive",
      reason1Desc: "A dedicated space for the new era of generative audio. No human-only tracks allowed.",
      reason2Title: "Spotify Verified",
      reason2Desc: "We only list tracks hosted on Spotify. This ensures every artist is serious, monetizing, and delivering professional quality audio—no throwaway generations.",
      reason3Title: "Community Ranked",
      reason3Desc: "Rankings are decided by votes and engagement. The community decides what's hot.",
      sponsorTitle: "Sponsored By",
      bachDesc: "The ultimate AI music assistant for the pre-generation process. Compose with logic before you prompt.",
      bachBtn: "Try Bach Assistant",
      auramasterDesc: "The AI post-production DAW to master your songs. Professional polish for generative audio.",
      auramasterBtn: "Try Auramaster"
    },
    nav: {
      search: "Search artists, songs, or genres...",
      submit: "Submit Track",
      login: "Login",
      user: "User",
      admin: "Admin",
      dashboard: "Dashboard"
    },
    home: {
      yourSubmissions: "Your Submissions",
      charts: "Charts",
      globalRanking: "Global Ranking",
      descMy: "Track the performance of your AI masterpieces.",
      descAll: "The most popular AI-generated tracks, ranked by popularity and votes.",
      filterGenre: "Filter by Genre:",
      pos: "Pos",
      trackInfo: "Track Preview / Info",
      stats: "Stats",
      rate: "Rate",
      myTracks: "My Tracks",
      noSongs: "No songs found for this criteria.",
      footer: "AI Music Charts. Built for the future of sound.",
      time: {
        allTime: "All Time",
        month: "Month",
        week: "Week",
        fresh: "Fresh"
      }
    },
    row: {
      new: "New",
      previewUnavailable: "Preview Unavailable",
      hot: "Hot on Spotify",
      voteNow: "Vote Now",
      playToVote: "Play to Vote",
      share: "Share This Track",
      stream: "Stream on Spotify",
      debut: "Debut Position",
      peak: "Peak Position",
      debutDate: "Debut Chart Date",
      peakDate: "Peak Chart Date",
      edit: "Edit",
      transfer: "Transfer",
      editInfo: "* You can update the genre/language for this track one time only.",
      subGenre: "Sub-Genre",
      artistChannels: "Artist Channels",
      addChannel: "Add Channel",
      channelUrl: "Channel URL",
      stats: {
        lw: "LW",
        peak: "Peak",
        wks: "Wks",
        votes: "votes"
      },
      badges: {
        fresh: "FRESH",
        up: "Rising",
        down: "Falling",
        weeks: "weeks on chart",
        bach: "BACH"
      }
    },
    modal: {
      title: "Submit Track",
      subtitle: "Add your AI masterpiece to the charts.",
      submitted: "Submitted!",
      submittedDesc: "Your track is now in the queue for the charts.",
      url: "Spotify URL",
      previewHint: "The Song Title and Artist will be automatically detected.",
      genre: "Genre",
      subGenre: "Sub-Genre (Optional)",
      language: "Language",
      channels: "Artist Channels (Optional)",
      addChannel: "Add Link",
      bachAssisted: "Bach Assisted Composition",
      processing: "Processing...",
      btnSubmit: "Submit Track"
    },
    transfer: {
      title: "Transfer Ownership",
      subtitle: "Move this track to another user or label account.",
      searchPlaceholder: "Search by Username or Label...",
      searching: "Searching users...",
      noUsers: "No users found.",
      confirm: "Transfer to",
      success: "Track Transferred!",
      warning: "This action cannot be undone. You will lose editing rights."
    },
    profile: {
      title: "User Profile",
      nameLabel: "Artist / Label Name",
      countryLabel: "Country",
      emailLabel: "Email (Registered)",
      save: "Save Changes",
      saved: "Profile Updated!"
    },
    admin: {
      title: "Admin Dashboard",
      totalSongs: "Total Songs",
      totalVotes: "Total Votes",
      totalUsers: "Total Users",
      activeUploaders: "Active Uploaders",
      latestUpload: "Latest Upload",
      latestVote: "Latest Vote",
      topCountriesSub: "Top Countries (Submissions)",
      topCountriesVote: "Top Countries (Votes)",
      topSubmitters: "Top Submitters",
      topArtists: "Top Artists (By Votes Received)",
      noData: "No data available yet."
    },
    auth: {
      join: "Join the Club",
      welcome: "Welcome Back",
      joinDesc: "Start voting and uploading today.",
      welcomeDesc: "Login to access your tracks.",
      username: "Username / Label",
      usernamePlaceholder: "Enter your username or label name",
      email: "Email",
      password: "Password",
      create: "Create Account",
      signin: "Sign In",
      hasAccount: "Already have an account?",
      noAccount: "Don't have an account?",
      login: "Login",
      register: "Register"
    }
  },
  Spanish: {
    common: {
      all: "Todos",
      global: "Global"
    },
    landing: {
      heroTitle: "El Billboard de la Música IA",
      heroDesc: "El mejor chart exclusivo para música generada por IA. Descubre, vota y clasifica los éxitos algorítmicos.",
      enterBtn: "Entrar al Chart",
      whyTitle: "¿Por qué Melodia?",
      reason1Title: "Exclusivo IA",
      reason1Desc: "Un espacio dedicado a la nueva era del audio generativo. No se permiten pistas humanas.",
      reason2Title: "Verificado por Spotify",
      reason2Desc: "Solo listamos pistas en Spotify. Esto asegura que cada artista es serio, monetiza y ofrece calidad profesional.",
      reason3Title: "Ranking Comunitario",
      reason3Desc: "Las clasificaciones se deciden por votos y participación. La comunidad decide qué es tendencia.",
      sponsorTitle: "Patrocinado Por",
      bachDesc: "El mejor asistente de música IA para el proceso previo a la generación. Compón con lógica antes de escribir el prompt.",
      bachBtn: "Prueba Bach Assistant",
      auramasterDesc: "El DAW de postproducción con IA para masterizar tus canciones. Acabado profesional para audio generativo.",
      auramasterBtn: "Prueba Auramaster"
    },
    nav: {
      search: "Buscar artistas, canciones o géneros...",
      submit: "Subir Pista",
      login: "Acceder",
      user: "Usuario",
      admin: "Admin",
      dashboard: "Panel"
    },
    home: {
      yourSubmissions: "Tus Subidas",
      charts: "Listas",
      globalRanking: "Ranking Global",
      descMy: "Rastrea el rendimiento de tus obras maestras de IA.",
      descAll: "Las pistas generadas por IA más populares, clasificadas por popularidad y votos.",
      filterGenre: "Filtrar por Género:",
      pos: "Pos",
      trackInfo: "Vista Previa / Info",
      stats: "Estadísticas",
      rate: "Votar",
      myTracks: "Mis Pistas",
      noSongs: "No se encontraron canciones con este criterio.",
      footer: "Listas de Música IA. Construidas para el futuro del sonido.",
      time: {
        allTime: "Todos los tiempos",
        month: "Mes",
        week: "Semana",
        fresh: "Nuevos"
      }
    },
    row: {
      new: "Nuevo",
      previewUnavailable: "Vista Previa No Disponible",
      hot: "Tendencia en Spotify",
      voteNow: "Vota Ahora",
      playToVote: "Reproducir para Votar",
      share: "Compartir Pista",
      stream: "Escuchar en Spotify",
      debut: "Posición Debut",
      peak: "Posición Máxima",
      debutDate: "Fecha Debut",
      peakDate: "Fecha Pico",
      edit: "Editar",
      transfer: "Transferir",
      editInfo: "* Solo puedes actualizar el género/idioma de esta pista una vez.",
      subGenre: "Subgénero",
      artistChannels: "Canales del Artista",
      addChannel: "Añadir Canal",
      channelUrl: "URL del Canal",
      stats: {
        lw: "Ant",
        peak: "Pico",
        wks: "Sem",
        votes: "votos"
      },
      badges: {
        fresh: "NUEVO",
        up: "Subiendo",
        down: "Bajando",
        weeks: "semanas",
        bach: "BACH"
      }
    },
    modal: {
      title: "Subir Pista",
      subtitle: "Añade tu obra maestra de IA a las listas.",
      submitted: "¡Enviado!",
      submittedDesc: "Tu pista está ahora en la cola de las listas.",
      url: "URL de Spotify",
      previewHint: "El título y artista se detectarán automáticamente.",
      genre: "Género",
      subGenre: "Subgénero (Opcional)",
      language: "Idioma",
      channels: "Canales del Artista (Opcional)",
      addChannel: "Añadir Enlace",
      bachAssisted: "Composición Asistida por Bach",
      processing: "Procesando...",
      btnSubmit: "Enviar Pista"
    },
    transfer: {
      title: "Transferir Propiedad",
      subtitle: "Mueve esta pista a otro usuario o sello.",
      searchPlaceholder: "Buscar por Usuario o Sello...",
      searching: "Buscando usuarios...",
      noUsers: "No se encontraron usuarios.",
      confirm: "Transferir a",
      success: "¡Pista Transferida!",
      warning: "Esta acción no se puede deshacer. Perderás los derechos de edición."
    },
    profile: {
      title: "Perfil de Usuario",
      nameLabel: "Nombre Artista / Sello",
      countryLabel: "País",
      emailLabel: "Correo (Registrado)",
      save: "Guardar Cambios",
      saved: "¡Perfil Actualizado!"
    },
    admin: {
      title: "Panel de Administración",
      totalSongs: "Canciones Totales",
      totalVotes: "Votos Totales",
      totalUsers: "Usuarios Totales",
      activeUploaders: "Uploaders Activos",
      latestUpload: "Última Subida",
      latestVote: "Último Voto",
      topCountriesSub: "Países Top (Subidas)",
      topCountriesVote: "Países Top (Votos)",
      topSubmitters: "Top Uploaders",
      topArtists: "Top Artistas (Por Votos)",
      noData: "No hay datos disponibles."
    },
    auth: {
      join: "Únete al Club",
      welcome: "Bienvenido de Nuevo",
      joinDesc: "Empieza a votar y subir hoy mismo.",
      welcomeDesc: "Inicia sesión para acceder a tus pistas.",
      username: "Usuario / Sello",
      usernamePlaceholder: "Ingresa tu usuario o nombre del sello",
      email: "Correo",
      password: "Contraseña",
      create: "Crear Cuenta",
      signin: "Iniciar Sesión",
      hasAccount: "¿Ya tienes cuenta?",
      noAccount: "¿No tienes cuenta?",
      login: "Acceder",
      register: "Registrarse"
    }
  },
  Korean: {
    common: {
      all: "전체",
      global: "글로벌"
    },
    landing: {
      heroTitle: "AI 음악의 빌보드",
      heroDesc: "세계 최고의 AI 생성 음악 전용 차트입니다. 내일의 알고리즘 히트곡을 발견하고, 투표하고, 순위를 매기세요.",
      enterBtn: "차트 입장",
      whyTitle: "왜 Melodia인가?",
      reason1Title: "AI 독점",
      reason1Desc: "생성형 오디오의 새로운 시대를 위한 전용 공간입니다.",
      reason2Title: "스포티파이 인증",
      reason2Desc: "스포티파이에 등록된 트랙만 리스트합니다. 이는 모든 아티스트가 수익을 창출하고 전문적인 품질을 제공함을 보장합니다.",
      reason3Title: "커뮤니티 랭킹",
      reason3Desc: "순위는 투표와 참여로 결정됩니다. 커뮤니티가 무엇이 핫한지 결정합니다.",
      sponsorTitle: "후원",
      bachDesc: "생성 전 과정을 위한 최고의 AI 음악 어시스턴트. 프롬프트를 작성하기 전에 논리로 작곡하세요.",
      bachBtn: "Bach 어시스턴트 체험",
      auramasterDesc: "곡을 마스터링하기 위한 AI 포스트 프로덕션 DAW. 생성형 오디오를 위한 전문적인 마무리.",
      auramasterBtn: "Auramaster 체험"
    },
    nav: {
      search: "아티스트, 곡, 장르 검색...",
      submit: "곡 제출",
      login: "로그인",
      user: "사용자",
      admin: "관리자",
      dashboard: "대시보드"
    },
    home: {
      yourSubmissions: "내 제출물",
      charts: "차트",
      globalRanking: "글로벌 랭킹",
      descMy: "AI 걸작의 성과를 추적하세요.",
      descAll: "인기와 투표로 순위가 매겨진 가장 인기 있는 AI 생성 트랙.",
      filterGenre: "장르별 필터:",
      pos: "순위",
      trackInfo: "트랙 미리보기 / 정보",
      stats: "통계",
      rate: "평가",
      myTracks: "내 트랙",
      noSongs: "조건에 맞는 곡이 없습니다.",
      footer: "AI 음악 차트. 사운드의 미래를 위해 구축되었습니다.",
      time: {
        allTime: "전체",
        month: "월간",
        week: "주간",
        fresh: "신곡"
      }
    },
    row: {
      new: "NEW",
      previewUnavailable: "미리보기 없음",
      hot: "스포티파이 인기",
      voteNow: "투표하기",
      playToVote: "재생하여 투표",
      share: "이 트랙 공유",
      stream: "스포티파이에서 듣기",
      debut: "데뷔 순위",
      peak: "최고 순위",
      debutDate: "데뷔 날짜",
      peakDate: "최고 순위 날짜",
      edit: "편집",
      transfer: "이전",
      editInfo: "* 이 트랙의 장르/언어는 한 번만 업데이트할 수 있습니다.",
      subGenre: "서브 장르",
      artistChannels: "아티스트 채널",
      addChannel: "채널 추가",
      channelUrl: "채널 URL",
      stats: {
        lw: "지난주",
        peak: "최고",
        wks: "주간",
        votes: "표"
      },
      badges: {
        fresh: "신곡",
        up: "상승",
        down: "하락",
        weeks: "주 차트인",
        bach: "BACH"
      }
    },
    modal: {
      title: "곡 제출",
      subtitle: "차트에 AI 걸작을 추가하세요.",
      submitted: "제출되었습니다!",
      submittedDesc: "트랙이 차트 대기열에 추가되었습니다.",
      url: "스포티파이 URL",
      previewHint: "노래 제목과 아티스트가 자동으로 감지됩니다.",
      genre: "장르",
      subGenre: "서브 장르 (선택)",
      language: "언어",
      channels: "아티스트 채널 (선택)",
      addChannel: "링크 추가",
      bachAssisted: "Bach 지원 작곡",
      processing: "처리 중...",
      btnSubmit: "곡 제출"
    },
    transfer: {
      title: "소유권 이전",
      subtitle: "이 트랙을 다른 사용자나 레이블 계정으로 이동합니다.",
      searchPlaceholder: "사용자 이름 또는 레이블 검색...",
      searching: "사용자 검색 중...",
      noUsers: "사용자를 찾을 수 없습니다.",
      confirm: "다음으로 이전",
      success: "트랙이 이전되었습니다!",
      warning: "이 작업은 취소할 수 없습니다. 편집 권한을 잃게 됩니다."
    },
    profile: {
      title: "사용자 프로필",
      nameLabel: "아티스트 / 레이블 이름",
      countryLabel: "국가",
      emailLabel: "이메일 (등록됨)",
      save: "변경 사항 저장",
      saved: "프로필 업데이트 완료!"
    },
    admin: {
      title: "관리자 대시보드",
      totalSongs: "총 노래",
      totalVotes: "총 투표 수",
      totalUsers: "총 사용자",
      activeUploaders: "활성 업로더",
      latestUpload: "최근 업로드",
      latestVote: "최근 투표",
      topCountriesSub: "상위 국가 (제출)",
      topCountriesVote: "상위 국가 (투표)",
      topSubmitters: "상위 업로더",
      topArtists: "상위 아티스트 (득표순)",
      noData: "데이터가 없습니다."
    },
    auth: {
      join: "클럽 가입",
      welcome: "다시 오신 것을 환영합니다",
      joinDesc: "오늘 투표와 업로드를 시작하세요.",
      welcomeDesc: "트랙에 액세스하려면 로그인하세요.",
      username: "사용자 이름 / 레이블",
      usernamePlaceholder: "사용자 이름 또는 레이블 이름 입력",
      email: "이메일",
      password: "비밀번호",
      create: "계정 만들기",
      signin: "로그인",
      hasAccount: "이미 계정이 있으신가요?",
      noAccount: "계정이 없으신가요?",
      login: "로그인",
      register: "등록"
    }
  },
  Japanese: {
    common: {
      all: "すべて",
      global: "グローバル"
    },
    landing: {
      heroTitle: "AI音楽のビルボード",
      heroDesc: "世界最高のAI生成音楽専用チャート。明日のアルゴリズムヒットを発見し、投票し、ランク付けしましょう。",
      enterBtn: "チャートに入る",
      whyTitle: "なぜMelodia？",
      reason1Title: "AI限定",
      reason1Desc: "生成オーディオの新時代のための専用スペース。人間のみのトラックは許可されません。",
      reason2Title: "Spotify認証",
      reason2Desc: "Spotifyでホストされているトラックのみをリストします。これにより、すべてのアーティストが真剣で、収益化しており、プロ品質のオーディオを提供していることが保証されます。",
      reason3Title: "コミュニティランキング",
      reason3Desc: "ランキングは投票とエンゲージメントによって決定されます。コミュニティがトレンドを決定します。",
      sponsorTitle: "スポンサー",
      bachDesc: "生成プロセスのための究極のAI音楽アシスタント。プロンプトの前にロジックで作曲しましょう。",
      bachBtn: "Bachアシスタントを試す",
      auramasterDesc: "曲をマスタリングするためのAIポストプロダクションDAW。生成オーディオにプロの磨きを。",
      auramasterBtn: "Auramasterを試す"
    },
    nav: {
      search: "アーティスト、曲、ジャンルを検索...",
      submit: "曲を送信",
      login: "ログイン",
      user: "ユーザー",
      admin: "管理者",
      dashboard: "ダッシュボード"
    },
    home: {
      yourSubmissions: "あなたの投稿",
      charts: "チャート",
      globalRanking: "グローバルランキング",
      descMy: "AI傑作のパフォーマンスを追跡します。",
      descAll: "人気と投票でランク付けされた、最も人気のあるAI生成トラック。",
      filterGenre: "ジャンルでフィルター:",
      pos: "順位",
      trackInfo: "プレビュー / 情報",
      stats: "統計",
      rate: "評価",
      myTracks: "マイトラック",
      noSongs: "条件に一致する曲が見つかりませんでした。",
      footer: "AI音楽チャート。未来のサウンドのために。",
      time: {
        allTime: "全期間",
        month: "月間",
        week: "週間",
        fresh: "新着"
      }
    },
    row: {
      new: "NEW",
      previewUnavailable: "プレビュー不可",
      hot: "Spotifyで人気",
      voteNow: "今すぐ投票",
      playToVote: "再生して投票",
      share: "この曲をシェア",
      stream: "Spotifyで聴く",
      debut: "デビュー順位",
      peak: "最高順位",
      debutDate: "デビュー日",
      peakDate: "最高順位日",
      edit: "編集",
      transfer: "転送",
      editInfo: "* このトラックのジャンル/言語の更新は1回のみ可能です。",
      subGenre: "サブジャンル",
      artistChannels: "アーティストチャンネル",
      addChannel: "チャンネルを追加",
      channelUrl: "チャンネルURL",
      stats: {
        lw: "先週",
        peak: "最高",
        wks: "週",
        votes: "票"
      },
      badges: {
        fresh: "新着",
        up: "上昇",
        down: "下降",
        weeks: "チャートイン週",
        bach: "BACH"
      }
    },
    modal: {
      title: "曲を送信",
      subtitle: "AI傑作をチャートに追加します。",
      submitted: "送信完了！",
      submittedDesc: "あなたのトラックがチャートのキューに追加されました。",
      url: "Spotify URL",
      previewHint: "曲のタイトルとアーティストは自動的に検出されます。",
      genre: "ジャンル",
      subGenre: "サブジャンル (任意)",
      language: "言語",
      channels: "アーティストチャンネル (任意)",
      addChannel: "リンクを追加",
      bachAssisted: "Bach支援による作曲",
      processing: "処理中...",
      btnSubmit: "曲を送信"
    },
    transfer: {
      title: "所有権の転送",
      subtitle: "このトラックを別のユーザーまたはレーベルアカウントに移動します。",
      searchPlaceholder: "ユーザー名またはレーベルで検索...",
      searching: "ユーザーを検索中...",
      noUsers: "ユーザーが見つかりません。",
      confirm: "転送先",
      success: "トラックが転送されました！",
      warning: "この操作は取り消せません。編集権限が失われます。"
    },
    profile: {
      title: "ユーザープロフィール",
      nameLabel: "アーティスト / レーベル名",
      countryLabel: "国",
      emailLabel: "メール (登録済み)",
      save: "変更を保存",
      saved: "プロフィール更新完了！"
    },
    admin: {
      title: "管理ダッシュボード",
      totalSongs: "総曲数",
      totalVotes: "総投票数",
      totalUsers: "総ユーザー数",
      activeUploaders: "アクティブな投稿者",
      latestUpload: "最新のアップロード",
      latestVote: "最新の投票",
      topCountriesSub: "トップ国（提出）",
      topCountriesVote: "トップ国（投票）",
      topSubmitters: "トップ投稿者",
      topArtists: "トップアーティスト（投票数順）",
      noData: "データはありません。"
    },
    auth: {
      join: "クラブに参加",
      welcome: "おかえりなさい",
      joinDesc: "投票とアップロードを今すぐ始めましょう。",
      welcomeDesc: "トラックにアクセスするにはログインしてください。",
      username: "ユーザー名 / レーベル",
      usernamePlaceholder: "ユーザー名またはレーベル名を入力",
      email: "メール",
      password: "パスワード",
      create: "アカウント作成",
      signin: "サインイン",
      hasAccount: "すでにアカウントをお持ちですか？",
      noAccount: "アカウントをお持ちではありませんか？",
      login: "ログイン",
      register: "登録"
    }
  }
};
