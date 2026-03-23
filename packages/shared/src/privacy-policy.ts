import type { AppLocale } from "./locale";

export const PRIVACY_POLICY_EFFECTIVE_DATE = "2026-03-22";
export const PRIVACY_POLICY_CONTACT_EMAIL = "gabrieljotalizardo@gmail.com";

export type PrivacyPolicySection = {
  bullets?: string[];
  paragraphs: string[];
  title: string;
};

export type PrivacyPolicyContent = {
  intro: string[];
  sections: PrivacyPolicySection[];
};

const privacyPolicyContent: Record<AppLocale, PrivacyPolicyContent> = {
  en: {
    intro: [
      "Janvas connects directly to the Canvas instance you choose and keeps the data needed to show your courses, assignments, files, messages, calendar items, and reminders on your device.",
      "This policy describes what Janvas accesses, what stays on your device, and what happens when you remove your account from the app.",
    ],
    sections: [
      {
        title: "What Janvas accesses",
        paragraphs: [
          "Janvas uses the Canvas API key and Canvas base URL that you provide to request your course data directly from your institution's Canvas service.",
        ],
        bullets: [
          "Profile information such as your name, email address, avatar, and Canvas user metadata",
          "Course data such as subjects, assignments, quizzes, pages, files, grades, people, groups, and inbox conversations",
          "Optional device integrations for calendar events and local notifications when you enable them",
        ],
      },
      {
        title: "What Janvas stores on your device",
        paragraphs: [
          "Your Canvas API key and provider URL are stored securely on your device using the platform secure storage.",
          "Janvas also stores app preferences, bookmarks, downloaded file previews, and short-lived cached Canvas responses on your device so the app can open faster and work more reliably.",
        ],
      },
      {
        title: "How device permissions are used",
        paragraphs: [
          "Calendar access is only used to create, update, and remove Janvas-managed assignment and quiz events when you enable calendar sync.",
          "Notification permission is only used to schedule Janvas-managed local reminders for upcoming assignments and quizzes that you choose to track.",
        ],
      },
      {
        title: "How data is shared",
        paragraphs: [
          "Janvas does not sell your personal data and does not use advertising SDKs.",
          "Your data is shared only with the services required to provide the app's features: your selected Canvas provider, the device calendar, and the local notification system when those features are enabled.",
        ],
      },
      {
        title: "Removing your data from this device",
        paragraphs: [
          "When you remove your account from this device in Janvas settings, the app deletes the saved Canvas credentials, cached Canvas data, bookmarks, downloaded file previews, and Janvas-managed local notifications and calendar items from the device.",
          "You can also revoke calendar or notification access later from your device settings.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          `For privacy questions or support requests, contact ${PRIVACY_POLICY_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  "pt-BR": {
    intro: [
      "O Janvas se conecta diretamente à instância do Canvas que você escolher e mantém no seu dispositivo os dados necessários para mostrar disciplinas, tarefas, arquivos, mensagens, itens do calendário e lembretes.",
      "Esta política descreve o que o Janvas acessa, o que fica no seu dispositivo e o que acontece quando você remove sua conta do app.",
    ],
    sections: [
      {
        title: "O que o Janvas acessa",
        paragraphs: [
          "O Janvas usa a chave da API do Canvas e a URL base do Canvas que você informar para buscar seus dados acadêmicos diretamente no serviço Canvas da sua instituição.",
        ],
        bullets: [
          "Informações de perfil como nome, e-mail, avatar e metadados do usuário no Canvas",
          "Dados de disciplinas como matérias, tarefas, quizzes, páginas, arquivos, notas, pessoas, grupos e conversas da caixa de entrada",
          "Integrações opcionais do dispositivo para eventos do calendário e notificações locais quando você as ativa",
        ],
      },
      {
        title: "O que o Janvas armazena no seu dispositivo",
        paragraphs: [
          "Sua chave da API do Canvas e a URL do provedor ficam armazenadas de forma segura no seu dispositivo usando o armazenamento seguro da plataforma.",
          "O Janvas também armazena preferências do app, favoritos, prévias de arquivos baixados e respostas em cache do Canvas por pouco tempo para abrir mais rápido e funcionar com mais estabilidade.",
        ],
      },
      {
        title: "Como as permissões do dispositivo são usadas",
        paragraphs: [
          "O acesso ao calendário é usado apenas para criar, atualizar e remover eventos de tarefas e quizzes gerenciados pelo Janvas quando você ativa a sincronização com o calendário.",
          "A permissão de notificações é usada apenas para agendar lembretes locais gerenciados pelo Janvas para tarefas e quizzes futuros que você escolher acompanhar.",
        ],
      },
      {
        title: "Como os dados são compartilhados",
        paragraphs: [
          "O Janvas não vende seus dados pessoais e não usa SDKs de publicidade.",
          "Seus dados são compartilhados apenas com os serviços necessários para fornecer os recursos do app: o provedor Canvas escolhido por você, o calendário do dispositivo e o sistema local de notificações quando esses recursos estiverem ativados.",
        ],
      },
      {
        title: "Como remover seus dados deste dispositivo",
        paragraphs: [
          "Quando você remove sua conta deste dispositivo nas configurações do Janvas, o app apaga as credenciais salvas do Canvas, os dados em cache do Canvas, os favoritos, as prévias de arquivos baixados e os lembretes locais e eventos de calendário gerenciados pelo Janvas.",
          "Você também pode revogar o acesso ao calendário ou às notificações depois nas configurações do dispositivo.",
        ],
      },
      {
        title: "Contato",
        paragraphs: [
          `Para dúvidas sobre privacidade ou pedidos de suporte, entre em contato por ${PRIVACY_POLICY_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
};

export function getPrivacyPolicyContent(locale: AppLocale) {
  return privacyPolicyContent[locale];
}
