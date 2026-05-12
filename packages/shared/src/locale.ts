export type AppLocale = "en" | "pt-BR";
export type LanguagePreference = "system" | AppLocale;

export const APP_LOCALES = ["en", "pt-BR"] as const;
export const DEFAULT_APP_LOCALE: AppLocale = "en";
export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "system";
export const LANGUAGE_PREFERENCE_STORAGE_KEY = "canvasLanguagePreference";
export const LANGUAGE_PREFERENCE_COOKIE = "canvasLanguagePreference";
export const LANGUAGE_PREFERENCE_EVENT = "canvas-language-preference-changed";

type MessageLeaf = string;
type MessageTree = {
  [key: string]: MessageLeaf | MessageTree;
};

const messages = {
  en: {
    common: {
      download: "Download",
      activeSubject: "Active subject",
      account: "Account",
      appearance: "Appearance",
      apply: "Apply",
      back: "Back",
      calendarPermission: "Calendar permission: {value}",
      canvas: "Janvas",
      canvasUserId: "Canvas user ID",
      changeApiKey: "Change API key",
      color: "Color",
      compact: "Compact",
      configurations: "Configurations",
      default: "Default",
      dueLabel: "Due: {value}",
      email: "Email",
      english: "English",
      errorTitle: "Something went wrong",
      hide: "Hide",
      hidden: "Hidden",
      language: "Language",
      lastSync: "Last sync: {value}",
      loading: "Loading...",
      madeBy: "Made by Gabriel Jota Lizardo",
      managed: "Managed",
      name: "Name",
      never: "Never",
      noDate: "No date",
      noDueDate: "No due date",
      noEmailAvailable: "No email available",
      noGrade: "No grade",
      noneYet: "Nothing here yet",
      notificationPermission: "Notification permission: {value}",
      off: "Off",
      on: "On",
      portugueseBrazil: "Português (Brasil)",
      profile: "Profile",
      privacyPolicy: "Privacy policy",
      remove: "Remove",
      retry: "Retry",
      resetColor: "Reset color",
      resetOrder: "Reset order",
      settings: "Settings",
      show: "Show",
      size: "Size",
      subject: "Subject",
      subjects: "Subjects",
      system: "System",
      type: "Type",
      unknown: "unknown",
      updated: "Updated",
      lastUpdated: "Last updated",
      visible: "Visible",
    },
    navigation: {
      bookmarks: "Bookmarks",
      calendar: "Calendar",
      dashboard: "Dashboard",
      inbox: "Inbox",
      profile: "Profile",
      subjects: "Subjects",
    },
    settings: {
      languageDescription: "Choose the app language, or follow the system language automatically.",
      languageSystemDescription: "Using system language: {language}",
      appLanguageTitle: "Language",
      updateCanvasCredentials: "Update the Canvas provider URL or API key saved on this device.",
      mobileDashboardSubjects: "Mobile dashboard subjects",
      mobileDashboardSubjectsDescription: "Make dashboard subject cards smaller on mobile so two subjects fit per row.",
      mobileSubjectBar: "Mobile subject bar",
      mobileSubjectBarDescription: "Show or hide the horizontal subject shortcuts above the mobile bottom navigation.",
      haptics: "Haptic feedback",
      hapticsDescription: "Optional tap feedback for supported phones and touch devices. It is queued asynchronously so it never waits on navigation.",
      themeDescription: "Use the system theme by default, or force light or dark mode for the whole app.",
      phoneCalendarSync: "Phone calendar sync",
      phoneCalendarSyncDescription: "Sync upcoming assignments and quizzes into the phone calendar. The app updates due-date changes and removes managed items when they disappear or are completed.",
      reminders: "Assignment and quiz reminders",
      remindersDescription: "Pick any combination of local reminders. Notifications are only scheduled for upcoming activities that are still incomplete.",
      syncNow: "Sync now",
      syncing: "Syncing...",
      subjectColorHint: "Enter any hex color like #3b82f6, or tap a swatch.",
      subjectColorInvalid: "Enter a valid 6-digit hex color.",
      reminderSevenAm: "7 AM due day",
      reminderThreeHours: "3 hours before",
      reminderOneHour: "1 hour before",
      overviewDescription: "Hide subjects from the dashboard and navigation, choose your own subject colors, or enable optional haptic feedback.",
      subjectsDescription: "Hide subjects, change their colors, and reorder them.",
      subjectsOrderDescription: "Use the arrows to reorder how active subjects appear in the dashboard and navigation.",
      suggestions: "Suggestions, fixes, or feedback:",
      linkedIn: "LinkedIn:",
      light: "Light",
      dark: "Dark",
      systemTheme: "System",
    },
    connect: {
      accountTitle: "Connect your Canvas account",
      accountSubtitle: "Paste your Canvas API key. It is stored securely on this device for future sessions.",
      credentialsTitle: "Credentials",
      setupEyebrow: "Secure device setup",
      urlLabel: "Canvas URL",
      urlPlaceholder: "Canvas URL (for example https://school.instructure.com)",
      apiEndpointLabel: "Canvas API endpoint",
      apiKeyLabel: "Canvas API key",
      apiKeyPlaceholder: "Paste your Canvas API key",
      highlightDeviceTitle: "Saved on this device",
      highlightDeviceBody: "Your Canvas URL and API key stay on this device for future sessions.",
      highlightDirectTitle: "Connect straight to Canvas",
      highlightDirectBody: "Janvas uses your institution URL directly instead of a separate sync service.",
      highlightQuickTitle: "Ready in about a minute",
      highlightQuickBody: "Create one token in Canvas, paste it here, and you are set.",
      howToGetKeyTitle: "How to get your API key",
      keyStep1: "1. Open Canvas and go to your profile or account settings page.",
      keyStep2: "2. Find the Approved Integrations section.",
      keyStep3: "3. Click New Access Token or Generate Token.",
      keyStep4: "4. Add a purpose if Canvas asks for it, then generate the token.",
      keyStep5: "5. Copy it immediately and paste it here, because Canvas only shows it once.",
      whatUrlTitle: "What Canvas URL to use",
      urlStep1: "1. Open your Canvas in the browser.",
      urlStep2: "2. Copy the main site URL before any page-specific path.",
      urlStep3: "3. Example: if you are on https://school.instructure.com/courses/123, use https://school.instructure.com.",
      urlStep4: "4. You can also paste the full /api/v1 URL if you already know it.",
      docsLink: "Official Canvas docs",
      connecting: "Connecting...",
      saveAndConnect: "Save key and connect",
      savingConfig: "Saving...",
      saveConfig: "Save configuration",
      clearCredentials: "Remove account from this device",
      saveError: "Could not save the configuration",
    },
    welcome: {
      title: "Welcome to Janvas",
      subtitle: "A calmer way to keep up with Canvas, deadlines, messages, and everything happening across your subjects.",
      cta: "Start with Janvas",
      deadlinesTitle: "Deadlines",
      deadlinesBody: "Today and this week, without the usual Canvas sprawl.",
      messagesTitle: "Messages",
      messagesBody: "Reply faster and move through your courses with less friction.",
      appTagline: "A calmer home for Canvas",
      subjectsPill: "Subjects",
      calendarPill: "Calendar",
      highlightOneTitle: "Much faster than Canvas",
      highlightOneBody: "Open subjects, files, assignments, pages, and messages with less loading and less menu-hopping.",
      highlightTwoTitle: "Extra features like bookmarks",
      highlightTwoBody: "Save important pages, files, quizzes, and assignments so the things you use most stay close.",
      highlightThreeTitle: "Calendar and notifications sync",
      highlightThreeBody: "Bring upcoming work into your calendar and get reminders on your device before deadlines.",
    },
    dashboard: {
      title: "Dashboard",
      subjects: "Subjects",
      showOldSubjects: "Show old subjects",
      hideOldSubjects: "Hide old subjects",
      oldSubjects: "Old subjects",
      noActiveSubjects: "No active subjects available.",
      todoTitle: "To-Do",
      upcomingActivities: "Upcoming activities",
      noPendingActivities: "No pending activities right now.",
      untitledTask: "Untitled task",
      noCode: "No code",
      oldSubject: "Old subject",
    },
    calendar: {
      title: "Calendar",
      viewCalendar: "Calendar",
      viewList: "List",
      upcoming: "Upcoming",
      scheduledItems: "{count} scheduled items",
      dayTitle: "Day {day}",
      selectedDayDescription: "Activities due on the selected day",
      upcomingDescription: "Next assignments and events",
      allDates: "All dates",
      nothingScheduled: "Nothing scheduled yet.",
      noEntriesForDay: "No items for this day.",
      noScheduledItemsFound: "No scheduled items found.",
      noUpcomingItemsFound: "No upcoming items found.",
      noActivitiesForDay: "No activities scheduled for this day.",
      assignmentKind: "Assignment",
      eventKind: "Event",
      done: "Done",
      more: "+{count} more",
      previousMonth: "Previous month",
      nextMonth: "Next month",
    },
    bookmarks: {
      title: "Bookmarks",
      subtitle: "Saved pages, assignments, quizzes, and files.",
      empty: "No bookmarks yet.",
      assignment: "Assignment",
      file: "File",
      page: "Page",
      quiz: "Quiz",
      removeBookmarkAria: "Remove {title} bookmark",
    },
    inbox: {
      title: "Inbox",
      subtitle: "Recent Canvas conversations and course-wide messages.",
      newMessage: "New message",
      conversation: "Conversation",
      queued: "Message queued. Canvas is sending the individual copies in the background.",
      sent: "Message sent.",
      messagesTitle: "Messages",
      messagesSubtitle: "Most recent conversations first",
      empty: "No recent conversations found.",
      noMessagesInConversation: "No messages found in this conversation.",
      conversationFallback: "Conversation",
      noSubject: "No subject",
      noPreview: "No preview available.",
      unread: "Unread",
      general: "General",
      recipients: "Recipients",
      recipientsCount: "{count} recipients",
      showRecipients: "Show recipients",
      hideRecipients: "Hide recipients",
      noParticipants: "No participants listed",
      noMessageBody: "No message body",
      reply: "Reply",
      replyRequired: "Write a reply before sending.",
      replySent: "Reply sent.",
      unableToSendReply: "Unable to send reply.",
      writeReply: "Write your reply",
      sendReply: "Send reply",
      sendingReply: "Sending...",
      attachment: "Attachment",
      system: "System",
      messageCount: "{count} messages",
    },
    profile: {
      informationFromCanvas: "Information available from the Canvas course user record",
      sharedActiveSubjects: "Shared active subjects",
      sharedActiveSubjectsDescription: "Active subjects that both you and this person are currently taking",
      noSharedActiveSubjects: "No shared active subjects were found.",
      canvasAccountCreated: "Canvas account created",
      loadingProfile: "Loading profile...",
      loadingPerson: "Loading person...",
      backToPeople: "Back to people",
      courseMember: "Course member",
    },
    subjects: {
      overview: "Overview",
      modules: "Modules",
      assignments: "Assignments",
      grades: "Grades",
      people: "People",
      groups: "Groups",
      forums: "Forums",
      files: "Files",
      subjectOverview: "Subject overview",
      lessonsAndMaterials: "Lessons and organized course materials",
      noModules: "No modules available for this subject.",
      courseMaterials: "Course materials",
      itemsCount: "{count} items",
      section: "Section",
      untitledItem: "Untitled item",
      content: "Content",
      upcomingAndRecentWork: "Upcoming and recent work for this subject",
      noAssignments: "No assignments available for this subject.",
      points: "{count} points",
      noPointsListed: "No points listed",
      gradePercent: "Grade %",
      overallPercentage: "Overall percentage in the subject",
      absolute: "Absolute",
      totalPointsEarned: "Total points earned by you",
      trend: "Trend",
      notEnoughGradedActivities: "Not enough graded activities yet",
      assignmentGrades: "Assignment grades",
      scoresAndSubmissionStatus: "Scores and submission status for this subject",
      gradesUnavailable: "Grades are not available for this subject.",
      noGradeData: "No grade data available for this subject.",
      allGroupsVisible: "All groups visible in this subject",
      allPeopleVisible: "Everyone currently visible in this subject",
      peopleUnavailable: "People are not available for this subject.",
      noPeople: "No people available for this subject.",
      groupsUnavailable: "Groups are not available for this subject.",
      noGroups: "No groups available for this subject.",
      canvasUser: "Canvas user",
      canvasGroup: "Canvas group",
      members: "{count} members",
      enterGroup: "Enter group",
      locked: "Locked",
      viewMembers: "View members",
      restrictedGroupMembers: "Canvas only exposes member lists for groups you are allowed to view. For this account, that appears to be only your own group.",
      noMemberList: "No member list available for this group.",
      discussionTopics: "Discussion topics for this subject",
      forumsUnavailable: "Forums are not available for this subject.",
      noForums: "No forums available for this subject.",
      untitledForum: "Untitled forum",
      replies: "{count} replies",
      unreadCount: "{count} unread",
      courseFiles: "Course files and materials",
      filesUnavailable: "Files are not available for this subject.",
      noFiles: "No files available for this subject.",
      untitledFile: "Untitled file",
      loadingSubject: "Loading subject...",
      loadingAssignment: "Loading assignment...",
      loadingPage: "Loading page...",
      loadingFile: "Loading file...",
      loadingGroup: "Loading group...",
      loadingPerson: "Loading person...",
      loadingQuiz: "Loading quiz...",
      backToSubject: "Back to subject",
      backToPeople: "Back to people",
      backToGroups: "Back to groups",
      backToFiles: "Back to files",
      untitledQuiz: "Untitled quiz",
      untitledPage: "Untitled page",
      group: "Group",
      unknownCourse: "Unknown course",
      groupLocked: "Group locked",
      peopleVisibleInGroup: "People visible inside this group",
      noPermissionToViewGroup: "You do not have permission to view this group. Canvas currently only allows this account to open groups you are authorized to access.",
      noMembersInGroup: "No members available for this group.",
      openInCanvas: "Open in Canvas",
      canvasVideo: "Canvas video",
      canvasVideoUnavailable: "This video can't be played inside Janvas.",
      canvasVideoOpenOriginal: "Open the original Canvas page to watch it in the official player.",
      openEmbeddedMedia: "Open embedded media",
      details: "Details",
      submission: "Submission",
      submitting: "Submitting",
      available: "Available",
      now: "Now",
      until: "until {value}",
      noLockDate: "No lock date",
      status: "Status",
      submitted: "Submitted",
      submittedAt: "Submitted at",
      notSubmittedYet: "Not submitted yet",
      grade: "Grade",
      attemptsAllowed: "Attempts allowed",
      access: "Access",
      lockedForYou: "Locked for you",
      noAssignmentDescription: "No assignment description available.",
      noPageContent: "No content available for this page.",
      noQuizDescription: "No quiz description available.",
      previousContent: "Previous content",
      nextContent: "Next content",
      noPreviousContent: "No previous content",
      noNextContent: "No next content",
      pageContent: "Page content",
      frontPage: "Front page",
      preview: "Preview",
      fileDetails: "File details",
      openFile: "Open file",
      openingFile: "Opening file...",
      pdfMobileDescription: "PDFs open in your device viewer on mobile.",
      previewUnavailable: "This file type can't be previewed here.",
      loadingPdfPreview: "Loading PDF preview...",
      pdfPreviewUnavailable: "PDF preview is not available right now.",
      previewWordWarning: "Some complex Word formatting may not render exactly the same in this preview.",
      previewSlidesDescription: "This preview shows the extracted slide text. Complex layouts, animations, and some media may still look better in the original file.",
      noPreviewableSlideText: "No previewable slide text was found in this presentation.",
      slide: "Slide {number}",
      noAdditionalSlideText: "No additional text found on this slide.",
      quizDetails: "Quiz details",
      questions: "Questions",
      questionsUnavailable: "Questions are not available for this quiz through the API.",
      questionLabel: "Question {number}",
      noQuestionText: "No question text available.",
      optionLabel: "Option {number}",
      questionCount: "{count} questions",
      pointsShort: "{count} pts",
      textEntry: "Text entry",
      websiteUrl: "Website URL",
      fileUpload: "File upload",
      discussion: "Discussion",
      mediaRecording: "Media recording",
      studentAnnotation: "Student annotation",
      externalTool: "External tool",
      noSubmission: "No submission",
      onPaper: "On paper",
      notSpecified: "Not specified",
      excused: "Excused",
      notSubmitted: "Not submitted",
      assignmentIsQuiz: "This assignment is a quiz. Quiz content can be opened from module quiz items.",
      assignmentUnsupportedSubmission: "This assignment type can't be submitted directly here yet.",
      submittedFiles: "Submitted files",
      newSubmission: "New submission",
      writeSubmissionHere: "Write your submission here",
      chooseFiles: "Choose files",
      filesSelected: "{count} files selected",
      optionalSubmissionComment: "Optional submission comment",
      submitAssignmentAction: "Submit assignment",
      submittingAssignmentAction: "Submitting...",
      submittedSuccessfully: "Submitted successfully",
      couldNotSubmitAssignment: "Could not submit assignment",
      comments: "Comments",
      noCommentsYet: "No comments yet.",
      addComment: "Add a comment",
      sendComment: "Send comment",
      sendingComment: "Sending...",
      commentSentSuccessfully: "Comment sent successfully",
      couldNotSubmitComment: "Could not submit comment",
      downloadSubmittedFile: "Download submitted file",
      attachment: "Attachment",
    },
    relative: {
      dueToday: "Due today",
      later: "Later",
      overdue: "Overdue",
      thisWeek: "This week",
      today: "Today",
      tomorrow: "Tomorrow",
      yesterday: "Yesterday",
    },
  },
  "pt-BR": {
    common: {
      download: "Baixar",
      activeSubject: "Disciplina ativa",
      account: "Conta",
      appearance: "Aparência",
      apply: "Aplicar",
      back: "Voltar",
      calendarPermission: "Permissão do calendário: {value}",
      canvas: "Janvas",
      canvasUserId: "ID do usuário no Canvas",
      changeApiKey: "Alterar chave da API",
      color: "Cor",
      compact: "Compacto",
      configurations: "Configurações",
      default: "Padrão",
      dueLabel: "Entrega: {value}",
      email: "E-mail",
      english: "English",
      errorTitle: "Algo deu errado",
      hide: "Ocultar",
      hidden: "Oculta",
      language: "Idioma",
      lastSync: "Última sincronização: {value}",
      loading: "Carregando...",
      madeBy: "Feito por Gabriel Jota Lizardo",
      managed: "Gerenciado",
      name: "Nome",
      never: "Nunca",
      noDate: "Sem data",
      noDueDate: "Sem data de entrega",
      noEmailAvailable: "Nenhum e-mail disponível",
      noGrade: "Sem nota",
      noneYet: "Nada por aqui ainda",
      notificationPermission: "Permissão de notificações: {value}",
      off: "Desativado",
      on: "Ativado",
      portugueseBrazil: "Português (Brasil)",
      profile: "Perfil",
      privacyPolicy: "Política de privacidade",
      remove: "Remover",
      retry: "Tentar novamente",
      resetColor: "Redefinir cor",
      resetOrder: "Redefinir ordem",
      settings: "Configurações",
      show: "Mostrar",
      size: "Tamanho",
      subject: "Disciplina",
      subjects: "Disciplinas",
      system: "Sistema",
      type: "Tipo",
      unknown: "desconhecido",
      updated: "Atualizado",
      lastUpdated: "Última atualização",
      visible: "Visível",
    },
    navigation: {
      bookmarks: "Favoritos",
      calendar: "Calendário",
      dashboard: "Início",
      inbox: "Caixa de entrada",
      profile: "Perfil",
      subjects: "Disciplinas",
    },
    settings: {
      languageDescription: "Escolha o idioma do app ou siga automaticamente o idioma do sistema.",
      languageSystemDescription: "Usando o idioma do sistema: {language}",
      appLanguageTitle: "Idioma",
      updateCanvasCredentials: "Atualize a URL do provedor Canvas ou a chave da API salva neste dispositivo.",
      mobileDashboardSubjects: "Disciplinas no painel móvel",
      mobileDashboardSubjectsDescription: "Deixe os cartões de disciplinas menores no celular para que duas disciplinas caibam por linha.",
      mobileSubjectBar: "Barra de disciplinas no celular",
      mobileSubjectBarDescription: "Mostre ou oculte os atalhos horizontais de disciplinas acima da navegação inferior.",
      haptics: "Feedback tátil",
      hapticsDescription: "Feedback opcional para toques em celulares e dispositivos com toque compatíveis. Ele é enfileirado de forma assíncrona para nunca atrasar a navegação.",
      themeDescription: "Use o tema do sistema por padrão ou force o modo claro ou escuro no app inteiro.",
      phoneCalendarSync: "Sincronização com o calendário do celular",
      phoneCalendarSyncDescription: "Sincronize próximas tarefas e quizzes com o calendário do celular. O app atualiza mudanças na data de entrega e remove itens gerenciados quando somem ou são concluídos.",
      reminders: "Lembretes de tarefas e quizzes",
      remindersDescription: "Escolha qualquer combinação de lembretes locais. As notificações só são agendadas para atividades futuras que ainda não foram concluídas.",
      syncNow: "Sincronizar agora",
      syncing: "Sincronizando...",
      subjectColorHint: "Digite qualquer cor hexadecimal como #3b82f6 ou toque em uma amostra.",
      subjectColorInvalid: "Digite uma cor hexadecimal válida com 6 dígitos.",
      reminderSevenAm: "7h no dia do prazo",
      reminderThreeHours: "3 horas antes",
      reminderOneHour: "1 hora antes",
      overviewDescription: "Oculte disciplinas do painel e da navegação, escolha suas próprias cores para disciplinas ou ative feedback tátil opcional.",
      subjectsDescription: "Oculte disciplinas, altere suas cores e reorganize-as.",
      subjectsOrderDescription: "Use as setas para reorganizar como as disciplinas ativas aparecem no painel e na navegação.",
      suggestions: "Sugestões, correções ou feedback:",
      linkedIn: "LinkedIn:",
      light: "Claro",
      dark: "Escuro",
      systemTheme: "Sistema",
    },
    connect: {
      accountTitle: "Conecte sua conta do Canvas",
      accountSubtitle: "Cole sua chave da API do Canvas. Ela fica armazenada com segurança neste dispositivo para as próximas sessões.",
      credentialsTitle: "Credenciais",
      setupEyebrow: "Configuração segura no dispositivo",
      urlLabel: "URL do Canvas",
      urlPlaceholder: "URL do Canvas (por exemplo https://school.instructure.com)",
      apiEndpointLabel: "Endpoint da API do Canvas",
      apiKeyLabel: "Chave da API do Canvas",
      apiKeyPlaceholder: "Cole sua chave da API do Canvas",
      highlightDeviceTitle: "Salvo neste dispositivo",
      highlightDeviceBody: "Sua URL do Canvas e sua chave da API ficam neste dispositivo para as próximas sessões.",
      highlightDirectTitle: "Conexão direta com o Canvas",
      highlightDirectBody: "O Janvas usa a URL da sua instituição diretamente, sem um serviço de sincronização separado.",
      highlightQuickTitle: "Pronto em cerca de um minuto",
      highlightQuickBody: "Crie um token no Canvas, cole aqui e a configuração fica pronta.",
      howToGetKeyTitle: "Como obter sua chave da API",
      keyStep1: "1. Abra o Canvas e vá para a página do seu perfil ou das configurações da conta.",
      keyStep2: "2. Encontre a seção Integrações aprovadas.",
      keyStep3: "3. Clique em Novo token de acesso ou Gerar token.",
      keyStep4: "4. Adicione uma finalidade se o Canvas pedir e depois gere o token.",
      keyStep5: "5. Copie o token imediatamente e cole aqui, porque o Canvas só mostra ele uma vez.",
      whatUrlTitle: "Qual URL do Canvas usar",
      urlStep1: "1. Abra o seu Canvas no navegador.",
      urlStep2: "2. Copie a URL principal do site antes de qualquer caminho específico de página.",
      urlStep3: "3. Exemplo: se você estiver em https://school.instructure.com/courses/123, use https://school.instructure.com.",
      urlStep4: "4. Você também pode colar a URL completa com /api/v1 se já souber qual é.",
      docsLink: "Documentação oficial do Canvas",
      connecting: "Conectando...",
      saveAndConnect: "Salvar chave e conectar",
      savingConfig: "Salvando...",
      saveConfig: "Salvar configuração",
      clearCredentials: "Remover conta deste dispositivo",
      saveError: "Não foi possível salvar a configuração",
    },
    welcome: {
      title: "Bem vindo ao Janvas",
      subtitle: "Uma forma mais tranquila de acompanhar o Canvas, prazos, mensagens e tudo o que acontece nas suas disciplinas.",
      cta: "Começar com o Janvas",
      deadlinesTitle: "Prazos",
      deadlinesBody: "Hoje e nesta semana, sem a bagunça de sempre do Canvas.",
      messagesTitle: "Mensagens",
      messagesBody: "Responda mais rápido e navegue pelas disciplinas com menos atrito.",
      appTagline: "Um lugar mais tranquilo para o Canvas",
      subjectsPill: "Disciplinas",
      calendarPill: "Calendário",
      highlightOneTitle: "Muito mais rápido que o Canvas",
      highlightOneBody: "Abra disciplinas, arquivos, tarefas, páginas e mensagens com menos espera e menos menus no caminho.",
      highlightTwoTitle: "Recursos extras, como favoritos",
      highlightTwoBody: "Salve páginas, arquivos, quizzes e tarefas importantes para deixar o que você mais usa sempre por perto.",
      highlightThreeTitle: "Sincronização com calendário e notificações",
      highlightThreeBody: "Leve as próximas atividades para o seu calendário e receba lembretes no dispositivo antes dos prazos.",
    },
    dashboard: {
      title: "Início",
      subjects: "Disciplinas",
      showOldSubjects: "Mostrar disciplinas antigas",
      hideOldSubjects: "Ocultar disciplinas antigas",
      oldSubjects: "Disciplinas antigas",
      noActiveSubjects: "Nenhuma disciplina ativa disponível.",
      todoTitle: "A fazer",
      upcomingActivities: "Próximas atividades",
      noPendingActivities: "Não há atividades pendentes agora.",
      untitledTask: "Tarefa sem título",
      noCode: "Sem código",
      oldSubject: "Disciplina antiga",
    },
    calendar: {
      title: "Calendário",
      viewCalendar: "Calendário",
      viewList: "Lista",
      upcoming: "Próximos",
      scheduledItems: "{count} itens agendados",
      dayTitle: "Dia {day}",
      selectedDayDescription: "Atividades com prazo no dia selecionado",
      upcomingDescription: "Próximas tarefas e eventos",
      allDates: "Todas as datas",
      nothingScheduled: "Nada agendado ainda.",
      noEntriesForDay: "Nenhum item para este dia.",
      noScheduledItemsFound: "Nenhum item agendado encontrado.",
      noUpcomingItemsFound: "Nenhum item próximo encontrado.",
      noActivitiesForDay: "Nenhuma atividade agendada para este dia.",
      assignmentKind: "Tarefa",
      eventKind: "Evento",
      done: "Concluído",
      more: "+{count} mais",
      previousMonth: "Mês anterior",
      nextMonth: "Próximo mês",
    },
    bookmarks: {
      title: "Favoritos",
      subtitle: "Páginas, tarefas, quizzes e arquivos salvos.",
      empty: "Ainda não há favoritos.",
      assignment: "Tarefa",
      file: "Arquivo",
      page: "Página",
      quiz: "Quiz",
      removeBookmarkAria: "Remover favorito de {title}",
    },
    inbox: {
      title: "Caixa de entrada",
      subtitle: "Conversas recentes do Canvas e mensagens enviadas para toda a disciplina.",
      newMessage: "Nova mensagem",
      conversation: "Conversa",
      queued: "Mensagem enfileirada. O Canvas está enviando as cópias individuais em segundo plano.",
      sent: "Mensagem enviada.",
      messagesTitle: "Mensagens",
      messagesSubtitle: "Conversas mais recentes primeiro",
      empty: "Nenhuma conversa recente encontrada.",
      noMessagesInConversation: "Nenhuma mensagem encontrada nesta conversa.",
      conversationFallback: "Conversa",
      noSubject: "Sem assunto",
      noPreview: "Nenhuma prévia disponível.",
      unread: "Não lida",
      general: "Geral",
      recipients: "Destinatários",
      recipientsCount: "{count} destinatários",
      showRecipients: "Mostrar destinatários",
      hideRecipients: "Ocultar destinatários",
      noParticipants: "Nenhum participante listado",
      noMessageBody: "Sem corpo da mensagem",
      reply: "Responder",
      replyRequired: "Escreva uma resposta antes de enviar.",
      replySent: "Resposta enviada.",
      unableToSendReply: "Não foi possível enviar a resposta.",
      writeReply: "Escreva sua resposta",
      sendReply: "Enviar resposta",
      sendingReply: "Enviando...",
      attachment: "Anexo",
      system: "Sistema",
      messageCount: "{count} mensagens",
    },
    profile: {
      informationFromCanvas: "Informações disponíveis no registro de usuário da disciplina no Canvas",
      sharedActiveSubjects: "Disciplinas ativas em comum",
      sharedActiveSubjectsDescription: "Disciplinas ativas que você e esta pessoa estão cursando atualmente",
      noSharedActiveSubjects: "Nenhuma disciplina ativa em comum foi encontrada.",
      canvasAccountCreated: "Conta do Canvas criada",
      loadingProfile: "Carregando perfil...",
      loadingPerson: "Carregando pessoa...",
      backToPeople: "Voltar para pessoas",
      courseMember: "Membro da disciplina",
    },
    subjects: {
      overview: "Visão geral",
      modules: "Módulos",
      assignments: "Tarefas",
      grades: "Notas",
      people: "Pessoas",
      groups: "Grupos",
      forums: "Fóruns",
      files: "Arquivos",
      subjectOverview: "Visão geral da disciplina",
      lessonsAndMaterials: "Aulas e materiais organizados da disciplina",
      noModules: "Nenhum módulo disponível para esta disciplina.",
      courseMaterials: "Materiais da disciplina",
      itemsCount: "{count} itens",
      section: "Seção",
      untitledItem: "Item sem título",
      content: "Conteúdo",
      upcomingAndRecentWork: "Trabalhos recentes e próximos desta disciplina",
      noAssignments: "Nenhuma tarefa disponível para esta disciplina.",
      points: "{count} pontos",
      noPointsListed: "Nenhuma pontuação informada",
      gradePercent: "% da nota",
      overallPercentage: "Percentual geral na disciplina",
      absolute: "Absoluto",
      totalPointsEarned: "Total de pontos conquistados por você",
      trend: "Tendência",
      notEnoughGradedActivities: "Ainda não há atividades avaliadas suficientes",
      assignmentGrades: "Notas das tarefas",
      scoresAndSubmissionStatus: "Pontuações e status de envio desta disciplina",
      gradesUnavailable: "As notas não estão disponíveis para esta disciplina.",
      noGradeData: "Nenhum dado de nota disponível para esta disciplina.",
      allGroupsVisible: "Todos os grupos visíveis nesta disciplina",
      allPeopleVisible: "Todas as pessoas visíveis nesta disciplina",
      peopleUnavailable: "As pessoas não estão disponíveis para esta disciplina.",
      noPeople: "Nenhuma pessoa disponível para esta disciplina.",
      groupsUnavailable: "Os grupos não estão disponíveis para esta disciplina.",
      noGroups: "Nenhum grupo disponível para esta disciplina.",
      canvasUser: "Usuário do Canvas",
      canvasGroup: "Grupo do Canvas",
      members: "{count} membros",
      enterGroup: "Entrar no grupo",
      locked: "Bloqueado",
      viewMembers: "Ver membros",
      restrictedGroupMembers: "O Canvas só expõe listas de membros para grupos que você pode visualizar. Para esta conta, isso parece ser apenas o seu próprio grupo.",
      noMemberList: "Nenhuma lista de membros disponível para este grupo.",
      discussionTopics: "Tópicos de discussão desta disciplina",
      forumsUnavailable: "Os fóruns não estão disponíveis para esta disciplina.",
      noForums: "Nenhum fórum disponível para esta disciplina.",
      untitledForum: "Fórum sem título",
      replies: "{count} respostas",
      unreadCount: "{count} não lidas",
      courseFiles: "Arquivos e materiais da disciplina",
      filesUnavailable: "Os arquivos não estão disponíveis para esta disciplina.",
      noFiles: "Nenhum arquivo disponível para esta disciplina.",
      untitledFile: "Arquivo sem título",
      loadingSubject: "Carregando disciplina...",
      loadingAssignment: "Carregando tarefa...",
      loadingPage: "Carregando página...",
      loadingFile: "Carregando arquivo...",
      loadingGroup: "Carregando grupo...",
      loadingPerson: "Carregando pessoa...",
      loadingQuiz: "Carregando quiz...",
      backToSubject: "Voltar para a disciplina",
      backToPeople: "Voltar para pessoas",
      backToGroups: "Voltar para grupos",
      backToFiles: "Voltar para arquivos",
      untitledQuiz: "Quiz sem título",
      untitledPage: "Página sem título",
      group: "Grupo",
      unknownCourse: "Disciplina desconhecida",
      groupLocked: "Grupo bloqueado",
      peopleVisibleInGroup: "Pessoas visíveis dentro deste grupo",
      noPermissionToViewGroup: "Você não tem permissão para ver este grupo. No momento, o Canvas só permite que esta conta abra grupos aos quais você tem acesso.",
      noMembersInGroup: "Nenhum membro disponível para este grupo.",
      openInCanvas: "Abrir no Canvas",
      canvasVideo: "Vídeo do Canvas",
      canvasVideoUnavailable: "Este vídeo não pode ser reproduzido dentro do Janvas.",
      canvasVideoOpenOriginal: "Abra a página original do Canvas para assistir no player oficial.",
      openEmbeddedMedia: "Abrir mídia incorporada",
      details: "Detalhes",
      submission: "Envio",
      submitting: "Enviando",
      available: "Disponível",
      now: "Agora",
      until: "até {value}",
      noLockDate: "Sem data de bloqueio",
      status: "Status",
      submitted: "Enviado",
      submittedAt: "Enviado em",
      notSubmittedYet: "Ainda não enviado",
      grade: "Nota",
      attemptsAllowed: "Tentativas permitidas",
      access: "Acesso",
      lockedForYou: "Bloqueado para você",
      noAssignmentDescription: "Nenhuma descrição de tarefa disponível.",
      noPageContent: "Nenhum conteúdo disponível para esta página.",
      noQuizDescription: "Nenhuma descrição de quiz disponível.",
      previousContent: "Conteúdo anterior",
      nextContent: "Próximo conteúdo",
      noPreviousContent: "Sem conteúdo anterior",
      noNextContent: "Sem próximo conteúdo",
      pageContent: "Conteúdo da página",
      frontPage: "Página inicial",
      preview: "Prévia",
      fileDetails: "Detalhes do arquivo",
      openFile: "Abrir arquivo",
      openingFile: "Abrindo arquivo...",
      pdfMobileDescription: "No celular, PDFs abrem no visualizador do dispositivo.",
      previewUnavailable: "Este tipo de arquivo não pode ser visualizado aqui.",
      loadingPdfPreview: "Carregando prévia do PDF...",
      pdfPreviewUnavailable: "A prévia do PDF não está disponível agora.",
      previewWordWarning: "Algumas formatações complexas do Word podem não aparecer exatamente da mesma forma nesta prévia.",
      previewSlidesDescription: "Esta prévia mostra o texto extraído dos slides. Layouts complexos, animações e algumas mídias ainda podem ficar melhores no arquivo original.",
      noPreviewableSlideText: "Nenhum texto de slide visualizável foi encontrado nesta apresentação.",
      slide: "Slide {number}",
      noAdditionalSlideText: "Nenhum texto adicional encontrado neste slide.",
      quizDetails: "Detalhes do quiz",
      questions: "Perguntas",
      questionsUnavailable: "As perguntas não estão disponíveis para este quiz pela API.",
      questionLabel: "Pergunta {number}",
      noQuestionText: "Nenhum texto de pergunta disponível.",
      optionLabel: "Opção {number}",
      questionCount: "{count} perguntas",
      pointsShort: "{count} pts",
      textEntry: "Resposta em texto",
      websiteUrl: "URL do site",
      fileUpload: "Envio de arquivo",
      discussion: "Discussão",
      mediaRecording: "Gravação de mídia",
      studentAnnotation: "Anotação do aluno",
      externalTool: "Ferramenta externa",
      noSubmission: "Sem envio",
      onPaper: "Em papel",
      notSpecified: "Não especificado",
      excused: "Dispensado",
      notSubmitted: "Não enviado",
      assignmentIsQuiz: "Esta tarefa é um quiz. O conteúdo do quiz pode ser aberto pelos itens de quiz nos módulos.",
      assignmentUnsupportedSubmission: "Este tipo de tarefa ainda não pode ser enviado diretamente aqui.",
      submittedFiles: "Arquivos enviados",
      newSubmission: "Novo envio",
      writeSubmissionHere: "Escreva sua resposta aqui",
      chooseFiles: "Escolher arquivos",
      filesSelected: "{count} arquivos selecionados",
      optionalSubmissionComment: "Comentário opcional do envio",
      submitAssignmentAction: "Enviar tarefa",
      submittingAssignmentAction: "Enviando...",
      submittedSuccessfully: "Enviado com sucesso",
      couldNotSubmitAssignment: "Não foi possível enviar a tarefa",
      comments: "Comentários",
      noCommentsYet: "Ainda não há comentários.",
      addComment: "Adicionar comentário",
      sendComment: "Enviar comentário",
      sendingComment: "Enviando...",
      commentSentSuccessfully: "Comentário enviado com sucesso",
      couldNotSubmitComment: "Não foi possível enviar o comentário",
      downloadSubmittedFile: "Baixar arquivo enviado",
      attachment: "Anexo",
    },
    relative: {
      dueToday: "Entrega hoje",
      later: "Depois",
      overdue: "Atrasado",
      thisWeek: "Esta semana",
      today: "Hoje",
      tomorrow: "Amanhã",
      yesterday: "Ontem",
    },
  },
} satisfies Record<AppLocale, MessageTree>;

type NestedKeyOf<T> = {
  [K in keyof T & string]:
    T[K] extends string
      ? K
      : T[K] extends Record<string, unknown>
        ? `${K}.${NestedKeyOf<T[K]>}`
        : never;
}[keyof T & string];

export type MessageKey = NestedKeyOf<(typeof messages)["en"]>;

export const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

export function parseLanguagePreference(value?: string | null): LanguagePreference {
  if (value === "en" || value === "pt-BR" || value === "system") {
    return value;
  }

  return DEFAULT_LANGUAGE_PREFERENCE;
}

export function normalizeAppLocale(value?: string | null): AppLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/_/g, "-").trim().toLowerCase();

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  if (normalized === "pt" || normalized.startsWith("pt-")) {
    return "pt-BR";
  }

  return null;
}

export function resolveAppLocale(
  preference: LanguagePreference = DEFAULT_LANGUAGE_PREFERENCE,
  candidates: Array<string | null | undefined> = [],
): AppLocale {
  if (preference !== "system") {
    return preference;
  }

  for (const candidate of candidates) {
    const locale = normalizeAppLocale(candidate);

    if (locale) {
      return locale;
    }
  }

  return DEFAULT_APP_LOCALE;
}

export function parseAcceptLanguageHeader(header?: string | null) {
  if (!header) {
    return [];
  }

  return header
    .split(",")
    .map((entry) => entry.trim().split(";")[0]?.trim())
    .filter(Boolean);
}

function getMessageValue(locale: AppLocale, key: MessageKey) {
  const segments = key.split(".");
  let current: MessageLeaf | MessageTree = messages[locale];

  for (const segment of segments) {
    current = (current as MessageTree)[segment] as MessageLeaf | MessageTree;
  }

  return current as MessageLeaf;
}

export function t(
  locale: AppLocale,
  key: MessageKey,
  params?: Record<string, string | number | undefined>,
) {
  const template = getMessageValue(locale, key);

  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? ""));
}

export function getLocaleDisplayName(locale: AppLocale, displayLocale: AppLocale = locale) {
  return locale === "pt-BR" ? t(displayLocale, "common.portugueseBrazil") : t(displayLocale, "common.english");
}

export function formatDateTime(locale: AppLocale, value?: string | null) {
  if (!value) {
    return t(locale, "common.noDate");
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDate(locale: AppLocale, value?: string | null) {
  if (!value) {
    return t(locale, "common.noDate");
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDueDate(locale: AppLocale, value?: string | null) {
  if (!value) {
    return t(locale, "common.noDueDate");
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDueDateShort(locale: AppLocale, value?: string | null) {
  if (!value) {
    return t(locale, "common.noDate");
  }

  const date = new Date(value);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return t(locale, "relative.today");
  }

  if (diffDays === 1) {
    return t(locale, "relative.tomorrow");
  }

  if (diffDays === -1) {
    return t(locale, "relative.yesterday");
  }

  if (diffDays > 0 && diffDays <= 7) {
    return date.toLocaleDateString(locale, { timeZone: DISPLAY_TIME_ZONE, weekday: "long" });
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

export function formatRelativeBucket(locale: AppLocale, value?: string | null) {
  if (!value) {
    return t(locale, "relative.later");
  }

  const now = new Date();
  const dueDate = new Date(value);
  const startOfToday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.floor((startOfDue - startOfToday) / 86_400_000);

  if (diffDays < 0) {
    return t(locale, "relative.overdue");
  }

  if (diffDays === 0) {
    return t(locale, "relative.dueToday");
  }

  if (diffDays <= 6) {
    return t(locale, "relative.thisWeek");
  }

  return t(locale, "relative.later");
}

export function formatGrade(locale: AppLocale, value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return t(locale, "common.noGrade");
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function capitalizeFirstLetter(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMonthLabel(locale: AppLocale, year: number, month: number) {
  return capitalizeFirstLetter(new Intl.DateTimeFormat(locale, {
    timeZone: DISPLAY_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12))));
}

export function getWeekdayLabels(locale: AppLocale, width: "long" | "narrow" | "short") {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: width,
  });

  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2024, 0, 7 + index, 12))),
  );
}
