import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Settings,
  MessageSquare,
  LogOut,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  Send,
  Check,
  Clock,
  ArrowLeft
} from 'lucide-react';

import { GoogleGenerativeAI } from '@google/generative-ai';

interface ShopProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  agency_name: string | null;
  google_location_id: string | null;
  google_drive_folder_id: string | null;
  line_user_id: string | null;
  reply_active: boolean;
  custom_review_prompt: string | null;
}

interface DraftPost {
  dayIndex: number;
  title: string;
  text: string;
  subKeywords: string[];
  imageFileId?: string | null;
  publishedAt?: string;
}

interface DashboardData {
  shopName: string;
  replyActive: boolean;
  imageCount: number;
  postingMode: string;
  postingModeLabel: string;
  pendingReviewsCount: number;
  nextPostTime: string;
  previewImage: string | null;
  googleLocationId: string | null;
  gbpActionUrl: string | null;
  draftPosts: DraftPost[];
}

interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  dataUrl?: string;
}

interface ReviewLog {
  id: string;
  shop_id: string;
  review_id: string;
  reviewer_name: string;
  star_rating: number;
  comment: string | null;
  reply_text: string | null;
  is_auto_replied: boolean;
  requires_alert: boolean;
  escalation_triggered: boolean;
  create_time: string;
  is_pre_integration?: boolean;
}

interface SettingsData {
  shopId: string;
  shopName: string;
  replyActive: boolean;
  customReviewPrompt: string;
  lineUserId: string;
  keywords: {
    mainKeywords: string[];
    subKeywords: string[];
    fixedFooter: string;
    customPrompt: string;
    hpUrl: string;
    tabelogUrl: string;
    hotpepperUrl: string;
    gurunaviUrl: string;
    gbpActionUrl: string;
    postTimeHour?: number;
  };
}

// ==========================================
// 🛡️ LOCAL DATABASE & MOCK DATA INITIALIZATION
// ==========================================

const getLocalData = (key: string, defaultValue: any) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
};

const saveLocalData = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const DEFAULT_SHOPS: ShopProfile[] = [
  {
    id: 'demo-agency-uuid',
    name: '代理店X',
    email: 'meoseiha@dairiten.x',
    password: 'meoseiha@dairiten.x',
    role: 'AGENCY',
    agency_name: '代理店X',
    google_location_id: null,
    google_drive_folder_id: null,
    line_user_id: null,
    reply_active: false,
    custom_review_prompt: null,
  },
  {
    id: 'demo-store-uuid',
    name: '美髪改善サロン Avenir Hair',
    email: 'meoseiha@avenir',
    password: 'meoseiha@avenir',
    role: 'OWNER',
    agency_name: '代理店X',
    google_location_id: 'locations/demo-loc-365',
    google_drive_folder_id: '10c1rRfqpsdLRz_ZlOgEXJFR7BoVsRjXe',
    line_user_id: 'U205e0595cff6e3882288962525941500',
    reply_active: true,
    custom_review_prompt: '完全個室のリラックス空間と、髪を傷めない最先端の髪質改善トリートメント、そして丁寧なカウンセリング技術を上品かつ温かみのあるトーンでPRしてください。不満のお言葉には深くお詫びし、接客改善と誠実なカウンセリング教育を徹底する姿勢を示してください。',
  }
];

const DEFAULT_KEYWORDS: SettingsData = {
  shopId: 'demo-store-uuid',
  shopName: '美髪改善サロン Avenir Hair',
  replyActive: true,
  customReviewPrompt: '完全個室のリラックス空間と、髪を傷めない最先端の髪質改善トリートメント、そして丁寧なカウンセリング技術を上品かつ温かみのあるトーンでPRしてください。不満のお言葉には深くお詫びし、接客改善と誠実なカウンセリング教育を徹底する姿勢を示してください。',
  lineUserId: 'U205e0595cff6e3882288962525941500',
  keywords: {
    mainKeywords: ['栄 美容室', '名古屋 髪質改善', '栄 カット', '髪質改善 サロン'],
    subKeywords: ['完全個室サロン', '縮毛矯正 栄', '白髪染め 名古屋', 'トリートメント 推奨'],
    fixedFooter: '店舗名: 美髪改善サロン Avenir Hair (アヴニールヘア)\n住所: 愛知県名古屋市中区栄3丁目\n営業時間: 10:00〜20:00 (完全予約制)\n定休日: 毎週月曜日\nご予約・お問い合わせはお気軽にどうぞ！',
    customPrompt: '完全個室のリラックス空間と、髪を傷めない最先端の髪質改善トリートメント、そして丁寧なカウンセリング技術を上品かつ温かみのあるトーンでPRしてください。',
    hpUrl: 'https://avenir-hair-demo.example.com',
    tabelogUrl: '',
    hotpepperUrl: 'https://beauty.hotpepper.jp/avenir-hair-demo',
    gurunaviUrl: '',
    gbpActionUrl: 'https://beauty.hotpepper.jp/avenir-hair-demo/reserve',
    postTimeHour: 12
  }
};

const DEFAULT_PHOTOS: DriveImage[] = [
  {
    id: '1mAUa_5jG1qfWImVO33gbgD_N9HtnNeBC',
    name: 'SmarterIT Free 美容院_外観.png',
    mimeType: 'image/png',
    size: '1.2 MB',
    createdTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1mAUa_5jG1qfWImVO33gbgD_N9HtnNeBC'
  },
  {
    id: '1k1xAP9U_ee3g7GFt2ing9dOS7qdnLsuP',
    name: 'SmarterIT Free 美容院_内観_ナチュラル.png',
    mimeType: 'image/png',
    size: '1.5 MB',
    createdTime: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1k1xAP9U_ee3g7GFt2ing9dOS7qdnLsuP'
  },
  {
    id: '138XhATQnllz0IkpqExEhESI_rLhPxdI4',
    name: 'SmarterIT Free 美容院_施術カウンセリング.png',
    mimeType: 'image/png',
    size: '0.8 MB',
    createdTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=138XhATQnllz0IkpqExEhESI_rLhPxdI4'
  },
  {
    id: '1_5q7104y2Ncboz0IbW40ZSbUHJ_n55fA',
    name: 'SmarterIT Free 美容院_施術台.png',
    mimeType: 'image/png',
    size: '1.9 MB',
    createdTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1_5q7104y2Ncboz0IbW40ZSbUHJ_n55fA'
  },
  {
    id: '1G8V2hFLfAHCJTg41z4iiqkm07HggjlAs',
    name: 'SmarterIT Free 美容院_シャンプー.png',
    mimeType: 'image/png',
    size: '2.1 MB',
    createdTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1G8V2hFLfAHCJTg41z4iiqkm07HggjlAs'
  },
  {
    id: '1I1kNZF7pDHsQEJiCNh3N6QKF0LhPTNHq',
    name: 'SmarterIT Free 美容院_女性ボブカット.png',
    mimeType: 'image/png',
    size: '1.4 MB',
    createdTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1I1kNZF7pDHsQEJiCNh3N6QKF0LhPTNHq'
  },
  {
    id: '19xxk0SmmkIc7ULg7NI9FRS8FWpGD-wLv',
    name: 'SmarterIT Free 美容院_男性ショートカット.png',
    mimeType: 'image/png',
    size: '1.1 MB',
    createdTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=19xxk0SmmkIc7ULg7NI9FRS8FWpGD-wLv'
  },
  {
    id: '1VtZRTWkrESNOL5n10r6X2GcjDu7_zSK5',
    name: 'SmarterIT Free 美容院_お客さまの笑顔.png',
    mimeType: 'image/png',
    size: '1.7 MB',
    createdTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1VtZRTWkrESNOL5n10r6X2GcjDu7_zSK5'
  },
  {
    id: '1QN6GSVJQmOyzyEw61hIaU_lBvbmvd_Un',
    name: '240_F_497036813_BE7edl7SAT9UdrJycPWSOO4EgyplNfaN.jpg',
    mimeType: 'image/jpeg',
    size: '0.9 MB',
    createdTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1QN6GSVJQmOyzyEw61hIaU_lBvbmvd_Un'
  },
  {
    id: '1ICy4qoD6qjOr-w4vD6T3I_xEAxMY0N4B',
    name: '240_F_677710881_O9cYLkbXmzVRmqM0TMA9FqPiZfzB566q.jpg',
    mimeType: 'image/jpeg',
    size: '1.6 MB',
    createdTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1ICy4qoD6qjOr-w4vD6T3I_xEAxMY0N4B'
  },
  {
    id: '1YRczsnYk5_EpPhY3U7N2RjyyOF8629u_',
    name: '240_F_877087459_tn3M02ct0kmxKmtOpy0I2Q4yVTNIG5OC.jpg',
    mimeType: 'image/jpeg',
    size: '1.3 MB',
    createdTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1YRczsnYk5_EpPhY3U7N2RjyyOF8629u_'
  },
  {
    id: '1iLC1rMI5az8xd8nK8tOEK9ZuszpDFHwW',
    name: '240_F_1959029839_wC3VN8D4xM4AGrUcFRP6FoLkwuMNSGQj.jpg',
    mimeType: 'image/jpeg',
    size: '1.0 MB',
    createdTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dataUrl: 'https://docs.google.com/uc?export=view&id=1iLC1rMI5az8xd8nK8tOEK9ZuszpDFHwW'
  }
];

const DEFAULT_REVIEWS: ReviewLog[] = [
  {
    id: 'rev-1',
    shop_id: 'demo-store-uuid',
    review_id: 'review-star-5',
    reviewer_name: '田中 瑞希',
    star_rating: 5,
    comment: 'カウンセリングがとても丁寧で、私の髪質に合わせたオーダーメイドの髪質改善トリートメントをしていただきました。仕上がりは驚くほどサラサラで、完全個室なので周りを気にせずリラックスできました！またお邪魔します。',
    reply_text: '瑞希様、ご来店いただき満点評価の素晴らしい口コミをありがとうございます！当サロンの丁寧なカウンセリングとオーダーメイドの髪質改善トリートメントを実感していただけて大変光栄です。完全個室のオアシス空間で日頃のお疲れを癒していただけたようで何よりでございます。今後とも瑞希様の美しい艶髪をキープできるよう、全力を尽くしてサポートさせていただきます。次回のご来店も心よりお待ちしております！',
    is_auto_replied: true,
    requires_alert: false,
    escalation_triggered: false,
    create_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-2',
    shop_id: 'demo-store-uuid',
    review_id: 'review-star-2',
    reviewer_name: '渡辺 直美',
    star_rating: 2,
    comment: 'トリートメントの仕上がりはとても満足で髪がツヤツヤになりました。ですが、予約時間から15分ほど待たされ、その際の説明や謝罪が少し冷たくてそっけなく感じられて悲しかったです。お店の雰囲気が素敵なだけに、接客がもう少し温かいと嬉しいです。',
    reply_text: '直美様、この度はご来店いただき、トリートメントの仕上がりにご満足いただけたにもかかわらず、ご案内まで15分ほどお待たせし、スタッフの対応において冷たく不快な思いをさせてしまいましたことを深くお詫び申し上げます。完全個室で癒やしをご提供するサロンとして、お客様への温かいおもてなしを忘れたご対応となり猛省しております。いただいたご指摘をスタッフ全員で共有し、接客と丁寧なカウンセリングの教育を徹底して改善に努めてまいります。貴重なご意見をありがとうございました。',
    is_auto_replied: false,
    requires_alert: true,
    escalation_triggered: false,
    create_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-3',
    shop_id: 'demo-store-uuid',
    review_id: 'review-star-4',
    reviewer_name: '鈴木 健太',
    star_rating: 4,
    comment: 'メンズカットとスカルプケアで利用しました。美容室は少し緊張するのですが、完全個室なので男性でも周りを気にせずリラックスできました。スタイリングの仕方も丁寧に教えてもらえたので大満足です。栄駅から近いのもいいですね。',
    reply_text: '健太様、この度はご来店いただき高評価をありがとうございます！当サロンは完全個室のプライベート空間ですので、男性のお客様も緊張せずリラックスして施術を受けていただけて大変嬉しく思います。スタイリングについてもお役に立てたようで幸いです。また何か気になる点やヘアスタイルのご要望がございましたら、お気軽にカウンセリングにてご相談くださいね。健太様のまたのご来店を心よりお待ちしております！',
    is_auto_replied: true,
    requires_alert: false,
    escalation_triggered: false,
    create_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-4',
    shop_id: 'demo-store-uuid',
    review_id: 'review-star-1',
    reviewer_name: '佐藤 優一',
    star_rating: 1,
    comment: '記念日の前なので奮発して指名で予約して行きましたが、ダブルブッキングしていたのか別のスタッフがメインで担当され、指名料を払っているのに説明も謝罪もありませんでした。非常に不快で残念な記念日になりました。二度と行きません。',
    reply_text: '優一様、この度は大切な記念日の前に当サロンをご予約いただき、楽しみにお越しいただいたにもかかわらず、当店の予約連携不足により別のスタッフがメインで対応し、かつ指名料に対する十分なご説明や真摯な謝罪を怠るという不手際がありましたことを心より深くお詫び申し上げます。せっかくの記念日の前のお気持ちを台無しにしてしまいましたことを猛省しております。指名管理体制の厳重な見直しと、接客教育の徹底を図り再発防止に努めてまいります。貴重なご指摘をありがとうございました。',
    is_auto_replied: false,
    requires_alert: true,
    escalation_triggered: true,
    create_time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  }
];

const DEFAULT_DRAFTS: DraftPost[] = [
  {
    dayIndex: 0,
    title: '今日投稿予定の下書き (Day 0)',
    text: '【髪質改善】栄駅徒歩5分の完全個室サロン Avenir Hair です。\n当サロンでは、お客様一人ひとりの髪質やクセに徹底的に向き合う「丁寧なカウンセリング技術」を大切にしています。\n\n栄で完全個室だからこそ、周りを気にせず髪のパサつきやダメージについて髪質改善トリートメントのご相談をいただけます。\n\n・オーダーメイドの極上髪質改善メニュー\n・完全個室のリラックスできるサロン空間\n・髪を傷めない最先端トリートメント技術\n\nお客様の髪本来の輝きとサロントリートメントによる感動的な艶を引き出します。\nお体のメンテナンスを兼ねて、ぜひ下記の「詳細」ボタンよりご予約情報をご確認ください。',
    subKeywords: ['栄 美容室', '髪質改善 サロン'],
    imageFileId: '1mAUa_5jG1qfWImVO33gbgD_N9HtnNeBC'
  },
  {
    dayIndex: 1,
    title: '明日投稿予定の下書き (Day 1)',
    text: '【縮毛矯正】うねりやくせ毛でお悩みなら栄の「Avenir Hair」にお任せください。\n当サロンでは、髪を傷めない最先端の薬剤を使用し、髪質改善トリートメントを同時に配合した縮毛矯正をご提供しています。\n\n完全個室のリラックスした極上空間で、仕上がりは驚くほど柔らかく滑らかな艶髪を実現します。\n\n・うねりやクセを自然に抑える縮毛矯正\n・丁寧なカウンセリングでお悩み徹底解消\n・縮毛矯正と髪質改善のダブルアプローチ\n\n毎朝のスタイリングが感動するほど楽になりますよ。\n詳しくは詳細ボタンよりご予約や空き状況をご確認ください。',
    subKeywords: ['完全個室サロン', '縮毛矯正 栄'],
    imageFileId: '1k1xAP9U_ee3g7GFt2ing9dOS7qdnLsuP'
  },
  {
    dayIndex: 2,
    title: '明後日投稿予定の下書き (Day 2)',
    text: '【白髪染め】頭皮と髪を優しく守る栄の髪質改善カラーなら「Avenir Hair」です。\n「白髪は染めたいけれど髪のパサつきやダメージが気になる」とお悩みではありませんか？\n\n当サロン独自の髪質改善トリートメントを配合した、優しく低刺激なオーガニックカラーをご提案します。\n\n・白髪染めとトリートメントの極上融合\n・完全個室でゆったり過ごせる大人の隠れ家\n・髪質に合わせたオーダーメイド施術\n\n潤いに満ちた、若々しくしっとりまとまる美しい艶髪に仕上げます。\nぜひ下記の詳細ボタンより空き状況をご確認ください。',
    subKeywords: ['白髪染め 名古屋', 'トリートメント 推奨'],
    imageFileId: '138XhATQnllz0IkpqExEhESI_rLhPxdI4'
  }
];

// ==========================================
// ⚙️ LOCAL DATA GETTERS & SETTERS (DB HELPER)
// ==========================================

const getLocalShops = (): ShopProfile[] => {
  const shops = getLocalData('all_shops', DEFAULT_SHOPS);
  const hasNewAvenir = shops.some((s: any) => s.email === 'meoseiha@avenir');
  
  // Check if photos list is updated to use our real Google Drive file IDs
  const localPhotos = localStorage.getItem('photos_demo-store-uuid');
  const hasRealPhotos = localPhotos ? JSON.parse(localPhotos).some((p: any) => p.id === '1mAUa_5jG1qfWImVO33gbgD_N9HtnNeBC') : false;

  if (!hasNewAvenir || !hasRealPhotos) {
    localStorage.removeItem('all_shops');
    localStorage.removeItem('all_settings');
    localStorage.removeItem('photos_demo-store-uuid');
    localStorage.removeItem('reviews_demo-store-uuid');
    localStorage.removeItem('dashboard_demo-store-uuid');
    return getLocalData('all_shops', DEFAULT_SHOPS);
  }
  return shops;
};

const DRIVE_PHOTO_MAP: { [id: string]: string } = {
  '1mAUa_5jG1qfWImVO33gbgD_N9HtnNeBC': 'SmarterIT Free 美容院_外観.png',
  '1k1xAP9U_ee3g7GFt2ing9dOS7qdnLsuP': 'SmarterIT Free 美容院_内観_ナチュラル.png',
  '138XhATQnllz0IkpqExEhESI_rLhPxdI4': 'SmarterIT Free 美容院_施術カウンセリング.png',
  '1_5q7104y2Ncboz0IbW40ZSbUHJ_n55fA': 'SmarterIT Free 美容院_施術台.png',
  '1G8V2hFLfAHCJTg41z4iiqkm07HggjlAs': 'SmarterIT Free 美容院_シャンプー.png',
  '1I1kNZF7pDHsQEJiCNh3N6QKF0LhPTNHq': 'SmarterIT Free 美容院_女性ボブカット.png',
  '19xxk0SmmkIc7ULg7NI9FRS8FWpGD-wLv': 'SmarterIT Free 美容院_男性ショートカット.png',
  '1VtZRTWkrESNOL5n10r6X2GcjDu7_zSK5': 'SmarterIT Free 美容院_お客さまの笑顔.png',
  '1QN6GSVJQmOyzyEw61hIaU_lBvbmvd_Un': '240_F_497036813_BE7edl7SAT9UdrJycPWSOO4EgyplNfaN.jpg',
  '1ICy4qoD6qjOr-w4vD6T3I_xEAxMY0N4B': '240_F_677710881_O9cYLkbXmzVRmqM0TMA9FqPiZfzB566q.jpg',
  '1YRczsnYk5_EpPhY3U7N2RjyyOF8629u_': '240_F_877087459_tn3M02ct0kmxKmtOpy0I2Q4yVTNIG5OC.jpg',
  '1iLC1rMI5az8xd8nK8tOEK9ZuszpDFHwW': '240_F_1959029839_wC3VN8D4xM4AGrUcFRP6FoLkwuMNSGQj.jpg'
};

const resolvePhotoUrl = (photoId: string | null | undefined): string => {
  if (!photoId) return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600';
  if (DRIVE_PHOTO_MAP[photoId]) {
    return `https://lh3.googleusercontent.com/d/${photoId}=w600`;
  }
  if (photoId.startsWith('mock-img-')) {
    return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600';
  }
  if (photoId.startsWith('http') || photoId.startsWith('data:')) {
    return photoId;
  }
  return `https://lh3.googleusercontent.com/d/${photoId}=w600`;
};

const getLocalSettings = (shopId: string): SettingsData => {
  const all = getLocalData('all_settings', {});
  if (!all[shopId]) {
    all[shopId] = { ...DEFAULT_KEYWORDS, shopId };
    saveLocalData('all_settings', all);
  }
  return all[shopId];
};
const getLocalPhotos = (shopId: string): DriveImage[] => getLocalData(`photos_${shopId}`, DEFAULT_PHOTOS);
const getLocalReviews = (shopId: string): ReviewLog[] => getLocalData(`reviews_${shopId}`, DEFAULT_REVIEWS);
const getLocalDashboard = (shopId: string): DashboardData => {
  const dbKey = `dashboard_${shopId}`;
  let db = localStorage.getItem(dbKey);
  if (!db) {
    const s = getLocalSettings(shopId);
    const p = getLocalPhotos(shopId);
    const r = getLocalReviews(shopId);
    const newDb: DashboardData = {
      shopName: s.shopName,
      replyActive: s.replyActive,
      imageCount: p.length,
      postingMode: p.length >= 10 ? 'ALWAYS_IMAGE' : 'ALTERNATING',
      postingModeLabel: p.length >= 10 ? '画像ストック10枚以上: 画像連続投稿モード' : `画像ストック${p.length}枚: 交互投稿モード`,
      pendingReviewsCount: r.filter(x => x.star_rating <= 2 && !x.is_auto_replied).length,
      nextPostTime: `本日 ${s.keywords.postTimeHour ?? 12}:00 予定`,
      previewImage: p.length > 0 ? p[0].dataUrl || null : null,
      googleLocationId: s.shopId === 'demo-store-uuid' ? 'locations/demo-loc-365' : null,
      gbpActionUrl: s.keywords.gbpActionUrl || null,
      draftPosts: DEFAULT_DRAFTS
    };
    saveLocalData(dbKey, newDb);
    return newDb;
  }
  return JSON.parse(db);
};

// ==========================================
// 🪄 IN-BROWSER AI TEXT GENERATION
// ==========================================

const callGeminiAI = async (apiKey: string, prompt: string): Promise<string> => {
  if (apiKey === 'SERVERLESS') {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Serverless Gemini generation failed');
    }
    const data = await res.json();
    return data.text;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
};

const buildGeminiPostPrompt = (shopName: string, dayIndex: number, storeSettings: SettingsData) => {
  const mainKeywords = storeSettings.keywords.mainKeywords || [];
  const subKeywords = storeSettings.keywords.subKeywords || [];
  const customPrompt = storeSettings.keywords.customPrompt || '';
  const fixedFooter = storeSettings.keywords.fixedFooter || '';

  return `
    あなたは店舗「${shopName}」のオーナー代理として、Googleマップ（MEO）および生成AI検索（AIO/LLMO）向けに最適化された、店舗投稿テキスト（おしらせ/最新情報）を作成してください。

    【今回の投稿テーマ】
    - テーマ: Day ${dayIndex}用。ヘアスタイル提案、縮毛矯正の魅力、完全個室空間へのこだわり、またはトリートメントによる髪質改善など。

    【店舗基本情報】
    - 店舗名: ${shopName}
    - ターゲット層へのアピール・トーンマナー: ${customPrompt || '上品で温かみのある丁寧なトーン。'}

    【作成の絶対ルール（厳守）】
    1. 結論ファースト（PREP法）: 最初の一文（30〜50文字）で時候の挨拶を省き、「【主要サービス名】店舗名＋エリア名（結論）」を言い切ってください。
    2. メインキーワードの自然な含有: [ ${mainKeywords.join(', ')} ] をすべて含めてください。
    3. サブキーワードの含有: [ ${subKeywords.join(', ')} ] を含めてください。
    4. 特徴の箇条書き: 中盤に「・」マークを使用した箇条書きで店舗のこだわりやウリを3点整理してください。
    5. アクション喚起（CTA）: 箇条書きの後、次の行動を促す文章を入れてください。
    6. フッター署名: 末尾に、店舗指定のフッター情報：
       ${fixedFooter}
       を自然に（記号装飾などを交えず純粋な改行テキストのみで）追加してください。
    7. 連絡先・URL等の重複排除: 重複する電話番号やホームページURLは、フッターに含まれているため本文側には絶対に含めないでください。
    8. 文字数制限: 全体で250文字〜350文字程度。
  `;
};

const buildGeminiReviewPrompt = (shopName: string, review: ReviewLog, customReviewPrompt: string | null, directive: string) => {
  return `
    あなたは店舗「${shopName}」のオーナー代理として、お客様から届いたGoogleマップ上の口コミ（星${review.star_rating}）に対して、返信用のお礼・お詫びメッセージ下書きを作成・書き直してください。

    【お客様からの口コミ内容】
    「${review.comment || '本文なし・評価のみ'}」

    【基本生成ルール】
    1. ${review.star_rating <= 2 ? '真摯な謝罪：不快な思いをさせてしまったことを真摯にお詫びしてください。' : '誠実な感謝：高評価をいただいたことに対する喜びと感謝を誠実に伝えてください。'}
    2. 口コミ内容（褒め言葉・不満点）に自然に反応し、寄り添ってください。
    3. ${review.star_rating <= 2 ? '感嘆符・絵文字・装飾は【一切完全禁止】です。句読点のみにしてください。' : '適度に「！」や絵文字を使っても構いません。'}
    4. 文字数は200文字以内に収めてください。署名情報は含めず、本文のみを作成してください。

    ${customReviewPrompt ? `【店舗別の個別指示】\n${customReviewPrompt}` : ''}

    【今回の店主からの「書き直し」追加指示】
    「${directive || '丁寧な日本語で作成してください。'}」
  `;
};

const generateFallbackPostText = (dayIndex: number, _mainKeywords: string[], _subKeywords: string[], fixedFooter: string, customPrompt: string) => {
  const themes = [
    {
      title: '髪質改善',
      intro: `【髪質改善】栄駅徒歩5分の完全個室サロン「Avenir Hair」です。`,
      body: `「パサつきや広がりで髪がまとまらない…」とお悩みではありませんか？当サロンでは、お客様一人ひとりの髪の状態に合わせたオーダーメイドの髪質改善トリートメントをご提供しています。`,
      bullets: [
        '髪本来の美しさを引き出す高濃度トリートメント',
        '周りの目を気にせず相談できる完全個室のリラックス空間',
        '丁寧なカウンセリングで髪のお悩みを徹底ケア'
      ],
      cta: `誰もが憧れるサラサラでツヤのある美髪を手に入れませんか？ご予約や詳細は下記のボタンよりご確認ください。`
    },
    {
      title: '縮毛矯正',
      intro: `【縮毛矯正】うねりやクセ毛でお悩みなら栄の「Avenir Hair」にお任せください。`,
      body: `当サロン独自の縮毛矯正技術と髪質改善ケアを組み合わせることで、ダメージを最小限に抑え、シルクのような自然で柔らかいストレートヘアを実現します。`,
      bullets: [
        'くせ毛や広がりを根元から自然にボリュームダウン',
        '髪を傷めない最先端の薬剤とアイロン技術',
        '髪質に合わせたオーダーメイドの施術プラン'
      ],
      cta: `雨の日でも広がらない、手入れ of しやすい理想の艶髪へ。ぜひ詳細ボタンよりご予約・空き状況をご確認ください。`
    },
    {
      title: 'オーガニックカラー',
      intro: `【白髪染め】頭皮と髪を優しく守る栄の髪質改善カラーなら「Avenir Hair」です。`,
      body: `「白髪染めを繰り返してパサつきが気になる…」という方のために、髪質改善トリートメントを同時に配合した低刺激なオーガニックカラーをご提供しています。`,
      bullets: [
        '頭皮と髪に優しい低刺激な厳選オーガニック薬剤',
        'カラーと同時に行う髪質改善トリートメントで圧倒的なツヤ感',
        '完全個室のプライベートな空間で落ち着いた施術タイム'
      ],
      cta: `実年齢を感じさせない、若々しくしなやかにまとまる艶髪へ。詳しくは下記の詳細情報をご確認ください。`
    }
  ];

  const t = themes[dayIndex % themes.length];
  let promptInfluence = '';
  if (customPrompt) {
    promptInfluence = `\n\n※オーナーからのメッセージ：\n「${customPrompt}」`;
  }

  return `${t.intro}\n\n${t.body}${promptInfluence}\n\n${t.bullets.map(b => `・${b}`).join('\n')}\n\n${t.cta}\n\n━━━━━━━━━━━━━━━━\n${fixedFooter}`;
};

const generateFallbackReviewReply = (starRating: number, reviewerName: string, directiveText: string) => {
  const isLowRating = starRating <= 2;
  const greeting = `${reviewerName}様、この度は当店にご来店いただき、また貴重なご意見をご投稿いただき誠にありがとうございます。`;
  
  let body = '';
  if (isLowRating) {
    body = `ご満足いただける対応ができず、また不快な思いをさせてしまいましたことを心より深くお詫び申し上げます。今後は、ご指摘いただいた内容をスタッフ全員で共有し、より快適にお過ごしいただける接客体制や技術指導の徹底を図ってまいります。`;
  } else {
    body = `当サロンの完全個室のリラックス空間や髪質改善トリートメントの仕上がりをお褒めいただき、大変光栄でございます！お客様の髪本来の美しさを引き出し、毎日のヘアケアが楽しくなるよう、これからも全力を尽くしてサポートさせていただきます。`;
  }

  let directiveAddon = '';
  if (directiveText) {
    directiveAddon = `\n\n【店主からの追記指示を反映】\n「${directiveText}」に基づき、ご案内やカウンセリングへの熱いこだわりを文脈に反映いたしました。これからもお客様に寄り添う美容室として日々進歩してまいります。`;
  }

  return `${greeting}\n\n${body}${directiveAddon}\n\n美髪改善サロン Avenir Hair 店主`;
};

// ==========================================
// 📱 MAIN COMPONENT FUNCTION
// ==========================================

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState<string | null>(localStorage.getItem('userRole'));
  const [currentShop, setCurrentShop] = useState<ShopProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'photos' | 'settings' | 'reviews'>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);

  // Authentication Form
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // API states
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [photos, setPhotos] = useState<DriveImage[]>([]);
  const [reviews, setReviews] = useState<ReviewLog[]>([]);

  // Sub-actions states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [recentSenders, setRecentSenders] = useState<{ userId: string; displayName: string; timestamp: number }[]>([]);
  const [isDetectingLine, setIsDetectingLine] = useState<boolean>(false);
  const [messageBanner, setMessageBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3-Day Draft states
  const [editingDraftText, setEditingDraftText] = useState<{ [dayIndex: number]: string }>({});
  const [isEditingDraft, setIsEditingDraft] = useState<{ [dayIndex: number]: boolean }>({});
  const [isSavingDrafts, setIsSavingDrafts] = useState<{ [dayIndex: number]: boolean }>({});
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState<{ [dayIndex: number]: boolean }>({});
  const [isRegeneratingAll, setIsRegeneratingAll] = useState<boolean>(false);

  // Master Account States
  const [shopsList, setShopsList] = useState<ShopProfile[]>([]);
  const [isViewingShop, setIsViewingShop] = useState<boolean>(false);
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');
  const [expandedAgencies, setExpandedAgencies] = useState<{ [key: string]: boolean }>({
    'THANXCREATE（直営店契約）': true
  });

  // Parse URL parameters for magic login token and tab redirection on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlTab = urlParams.get('tab');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      setToken(urlToken);
      // Clean query parameters from URL for a clean address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlTab === 'reviews') {
      setActiveTab('reviews');
    }
  }, []);

  // Fetch shops list for master/admin/agency accounts (Mocked)
  useEffect(() => {
    if ((userRole === 'ADMIN' || userRole === 'AGENCY') && token) {
      const fetchShops = () => {
        const shops = getLocalShops();
        // Filter out agency and admin profiles - only show shops with OWNER role
        const ownerOnlyShops = shops.filter(s => s.role === 'OWNER');
        setShopsList(ownerOnlyShops);
      };
      fetchShops();
    }
  }, [userRole, token]);

  // Auto-login or initial session verification on reload (Mocked)
  useEffect(() => {
    const verifySession = () => {
      if (!token) {
        setIsPageLoading(false);
        return;
      }

      try {
        const shops = getLocalShops();
        let shopId: string | null = null;

        if (token.startsWith('simulated_token_')) {
          const parts = token.split('_');
          if (parts.length >= 3) {
            shopId = parts.slice(2, -1).join('_');
          }
        } else {
          // One-time Magic link token simulation
          const magicTokens = getLocalData('magic_tokens', []);
          const foundToken = magicTokens.find((t: any) => t.token === token && !t.is_used && new Date() < new Date(t.expires_at));
          if (foundToken) {
            foundToken.is_used = true;
            saveLocalData('magic_tokens', magicTokens);
            shopId = foundToken.shop_id;
            const newToken = `simulated_token_${shopId}_long`;
            localStorage.setItem('token', newToken);
            setToken(newToken);
          }
        }

        const foundShop = shops.find(s => s.id === shopId);
        if (foundShop) {
          setCurrentShop(foundShop);
          setIsViewingShop(foundShop.role !== 'ADMIN' && foundShop.role !== 'AGENCY');
        } else {
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch (err) {
        console.error('Session verification failed:', err);
      } finally {
        setIsPageLoading(false);
      }
    };

    verifySession();
  }, [token]);

  // Load active tab data when shop or tab changes (Mocked with spinner delays)
  useEffect(() => {
    if (!currentShop) return;

    const fetchTabData = () => {
      setIsLoading(true);
      setTimeout(() => {
        try {
          if (activeTab === 'dashboard') {
            const data = getLocalDashboard(currentShop.id);
            setDashboard(data);
          } else if (activeTab === 'settings') {
            const data = getLocalSettings(currentShop.id);
            setSettings(data);
          } else if (activeTab === 'photos') {
            const files = getLocalPhotos(currentShop.id);
            setPhotos(files);
          } else if (activeTab === 'reviews') {
            const reviewLogs = getLocalReviews(currentShop.id);
            setReviews(reviewLogs);
          }
        } catch (err) {
          console.error(`Failed to fetch tab data (${activeTab}):`, err);
          showBanner('error', 'データの同期に失敗しました。');
        } finally {
          setIsLoading(false);
        }
      }, 500);
    };

    fetchTabData();
  }, [currentShop, activeTab]);

  // Show status banner helpers
  const showBanner = (type: 'success' | 'error', text: string) => {
    setMessageBanner({ type, text });
    setTimeout(() => setMessageBanner(null), 4000);
  };

  // Handle Login submission (Mocked)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    setTimeout(() => {
      try {
        const shops = getLocalShops();
        const foundShop = shops.find(s => s.email === email && s.password === password);
        
        if (foundShop) {
          const simulatedToken = `simulated_token_${foundShop.id}_long`;
          localStorage.setItem('token', simulatedToken);
          localStorage.setItem('userRole', foundShop.role);
          setToken(simulatedToken);
          setUserRole(foundShop.role);
          setCurrentShop(foundShop);
          setActiveTab('dashboard');
          setIsViewingShop(foundShop.role !== 'ADMIN' && foundShop.role !== 'AGENCY');
          showBanner('success', `「${foundShop.name}」としてログインしました！`);
        } else {
          setAuthError('メールアドレスまたはパスワードが正しくありません。');
        }
      } catch (err) {
        setAuthError('ログイン中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  // Log out helper
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setToken(null);
    setUserRole(null);
    setCurrentShop(null);
    setDashboard(null);
    setSettings(null);
    setPhotos([]);
    setReviews([]);
    setIsViewingShop(false);
    setShopSearchQuery('');
  };

  /*
  // Demo Fast Switcher (For easy demo purposes - switch between seeded profiles instantly)
  const handleDemoSwitch = async (emailAddr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, password: 'password', rememberMe: true }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        // Do NOT overwrite userRole here to maintain ADMIN switcher panel visibility!
        setToken(data.token);
        setCurrentShop(data.shop);
        setActiveTab('dashboard');
        showBanner('success', `「${data.shop.name}」のデモ画面に切り替えました。`);
      }
    } catch (err) {
      showBanner('error', '店舗の切り替えに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };
  */

  /*
  // Toggle Auto-reply ON/OFF status
  const handleToggleReply = async () => {
    if (!currentShop || !dashboard || isToggling) return;
    setIsToggling(true);

    const nextState = !dashboard.replyActive;

    try {
      const res = await fetch(`${API_BASE}/shops/${currentShop.id}/toggle-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState }),
      });

      if (res.ok) {
        setDashboard({ ...dashboard, replyActive: nextState });
        showBanner('success', `自動返信を「${nextState ? 'ON' : 'OFF'}」に切り替えました。`);
      } else {
        showBanner('error', '自動返信の切り替えに失敗しました。');
      }
    } catch (err) {
      showBanner('error', 'サーバーとの通信に失敗しました。');
    } finally {
      setIsToggling(false);
    }
  };
  */

  // Simulate daily posting and rollover slide (Mocked in browser with full Gemini / fallback support!)
  const handleSimulateRollover = async () => {
    if (!currentShop || !dashboard || isToggling) return;
    setIsToggling(true);

    setTimeout(async () => {
      try {
        const cleanDrafts = dashboard.draftPosts.filter((d: any) => d.dayIndex !== -1);
        if (cleanDrafts.length === 0) {
          throw new Error('下書きが存在しないため、自動生成処理を実行できません。');
        }

        // 1. The post being published today (Day 0)
        const publishedPost = cleanDrafts[0];
        const nextDayMinus1 = {
          dayIndex: -1,
          title: '本日投稿済みの下書き',
          text: publishedPost.text,
          subKeywords: publishedPost.subKeywords,
          imageFileId: publishedPost.imageFileId || null,
          publishedAt: new Date().toISOString(),
        };

        const draft1 = cleanDrafts[1] || publishedPost;
        const draft2 = cleanDrafts[2] || publishedPost;

        const nextDay0 = {
          dayIndex: 0,
          title: '今日投稿予定の下書き (Day 0)',
          text: draft1.text,
          subKeywords: draft1.subKeywords,
          imageFileId: draft1.imageFileId || null,
        };

        const nextDay1 = {
          dayIndex: 1,
          title: '明日投稿予定の下書き (Day 1)',
          text: draft2.text,
          subKeywords: draft2.subKeywords,
          imageFileId: draft2.imageFileId || null,
        };

        // 3. Generate a brand new Day 2 draft using Gemini AI or Local fallback!
        const storeSettings = getLocalSettings(currentShop.id);
        const allPhotos = getLocalPhotos(currentShop.id);
        
        let newDay2Text = '';
        const savedApiKey = localStorage.getItem('demo_gemini_api_key') || 'SERVERLESS';
        let usedAI = false;

        if (savedApiKey) {
          try {
            const prompt = buildGeminiPostPrompt(currentShop.name, 2, storeSettings);
            newDay2Text = await callGeminiAI(savedApiKey, prompt);
            usedAI = true;
          } catch (geminiErr) {
            console.warn('Gemini API call failed, using fallback generator:', geminiErr);
            newDay2Text = generateFallbackPostText(2, storeSettings.keywords.mainKeywords, storeSettings.keywords.subKeywords, storeSettings.keywords.fixedFooter, storeSettings.keywords.customPrompt);
          }
        } else {
          newDay2Text = generateFallbackPostText(2, storeSettings.keywords.mainKeywords, storeSettings.keywords.subKeywords, storeSettings.keywords.fixedFooter, storeSettings.keywords.customPrompt);
        }

        // Pick a photo (alternating/rotation)
        let selectedImgId: string | null = null;
        if (allPhotos.length > 0) {
          const usedImageIds = cleanDrafts.map(d => d.imageFileId).filter(Boolean);
          const availablePhotos = allPhotos.filter((p: any) => !usedImageIds.includes(p.id));
          const finalPhotosPool = availablePhotos.length > 0 ? availablePhotos : allPhotos;
          selectedImgId = finalPhotosPool[Math.floor(Math.random() * finalPhotosPool.length)].id;
        }

        const nextDay2 = {
          dayIndex: 2,
          title: '明後日投稿予定の下書き (Day 2)',
          text: newDay2Text,
          subKeywords: storeSettings.keywords.subKeywords.slice(0, 2),
          imageFileId: selectedImgId,
        };

        const newDrafts = [nextDayMinus1, nextDay0, nextDay1, nextDay2];
        
        const updatedDashboard = {
          ...dashboard,
          draftPosts: newDrafts
        };
        saveLocalData(`dashboard_${currentShop.id}`, updatedDashboard);
        setDashboard(updatedDashboard);

        showBanner('success', `【成功】${usedAI ? '🔑 [リアルGemini AI]' : '🪄 [ローカル高精度AI]'} 自動投稿＆下書きのスライドが完了しました！`);
      } catch (err: any) {
        showBanner('error', err.message || 'スライドテストに失敗しました。');
      } finally {
        setIsToggling(false);
      }
    }, 600);
  };

  // Clear "本日投稿済み" (-1) draft for testing (Mocked)
  const handleClearPublished = async () => {
    if (!currentShop || !dashboard || isToggling) return;
    if (!confirm('「本日投稿済み」カードを強制リセットして、今日最初の自動投稿テスト（Day 0の公開）を行えるようにしますか？')) return;
    setIsToggling(true);

    setTimeout(() => {
      try {
        const drafts = dashboard.draftPosts.filter((d: any) => d.dayIndex !== -1);
        const updatedDashboard = {
          ...dashboard,
          draftPosts: drafts,
        };
        saveLocalData(`dashboard_${currentShop.id}`, updatedDashboard);
        setDashboard(updatedDashboard);
        showBanner('success', '🟢 「本日投稿済み」カードを強制リセットし、3日間の予定表示に戻しました！');
      } catch (err) {
        showBanner('error', 'リセットに失敗しました。');
      } finally {
        setIsToggling(false);
      }
    }, 500);
  };

  // Save Settings forms (Mocked)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop || !settings) return;
    setIsLoading(true);

    setTimeout(() => {
      try {
        // Save settings to localStorage
        const allSettings = getLocalData('all_settings', {});
        allSettings[currentShop.id] = settings;
        saveLocalData('all_settings', allSettings);

        // Also update current shop profile
        const shops = getLocalShops();
        const idx = shops.findIndex(s => s.id === currentShop.id);
        if (idx !== -1) {
          shops[idx].reply_active = settings.replyActive;
          shops[idx].custom_review_prompt = settings.customReviewPrompt;
          saveLocalData('all_shops', shops);
          setCurrentShop(shops[idx]);
        }

        // Keep dashboard unified
        const db = getLocalDashboard(currentShop.id);
        db.replyActive = settings.replyActive;
        db.gbpActionUrl = settings.keywords.gbpActionUrl || null;
        saveLocalData(`dashboard_${currentShop.id}`, db);

        showBanner('success', '設定をブラウザのローカルストレージに正常に保存しました！');
      } catch (err) {
        showBanner('error', '設定の保存に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  // Trigger LINE Notification simulation (Mocked)
  const handleTestLineAlert = async () => {
    if (!currentShop) return;
    setIsLoading(true);

    setTimeout(() => {
      try {
        // Add a mock review that triggers LINE alert!
        const reviewLogs = getLocalReviews(currentShop.id);
        const testReviewId = `test-rev-${Date.now()}`;
        const newReview: ReviewLog = {
          id: testReviewId,
          shop_id: currentShop.id,
          review_id: testReviewId,
          reviewer_name: 'テスト 美佳',
          star_rating: 1,
          comment: '公式LINE通知の送信テストです。完全個室なのに隣の物音がうるさく、カウンセリングも少し雑に感じてしまいました。早期の改善をお願いしたいです。',
          reply_text: '美佳様、この度は当サロンにご来店いただいたにもかかわらず、完全個室でのリラックス空間をご提供できず、騒音によりご迷惑をおかけしましたことを深くお詫び申し上げます。また、丁寧さにかけるカウンセリング対応となりましたことを重ねてお詫び申し上げます。ご意見を直ちに共有し、個室防音の配慮やカウンセリング教育を改善・徹底してまいります。貴重なご意見をありがとうございました。',
          is_auto_replied: false,
          requires_alert: true,
          escalation_triggered: true,
          create_time: new Date().toISOString(),
        };

        const updatedReviews = [newReview, ...reviewLogs];
        saveLocalData(`reviews_${currentShop.id}`, updatedReviews);
        setReviews(updatedReviews);

        // Update dashboard pending review counts
        const db = getLocalDashboard(currentShop.id);
        db.pendingReviewsCount = updatedReviews.filter(x => x.star_rating <= 2 && !x.is_auto_replied).length;
        saveLocalData(`dashboard_${currentShop.id}`, db);
        setDashboard(db);

        showBanner('success', '🔔 スマホLINE宛てに模擬お詫び下書きアラートを即座にプッシュ送信しました！');
      } catch (err) {
        showBanner('error', 'LINEテスト通知の送信に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    }, 800);
  };

  // Fetch recent LINE message senders for self-pairing (Mocked)
  const handleDetectLineSenders = async () => {
    setIsDetectingLine(true);
    setTimeout(() => {
      const senders = [
        { userId: 'U1234567890abcdef', displayName: 'スタイリスト小林', timestamp: Date.now() - 2 * 60 * 1000 },
        { userId: 'U9876543210fedcba', displayName: 'オーナー木村', timestamp: Date.now() - 5 * 60 * 1000 }
      ];
      setRecentSenders(senders);
      showBanner('success', `🌟 LINEの送信者を ${senders.length}件 検出しました！`);
      setIsDetectingLine(false);
    }, 600);
  };

  // Direct Image upload to Google Drive (Mocked into localStorage)
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentShop) return;

    if (file.size > 5 * 1024 * 1024) {
      showBanner('error', '画像ファイルは5MB以下にしてください。');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setTimeout(() => {
        try {
          const newPhoto: DriveImage = {
            id: `mock-img-${Date.now()}`,
            name: file.name,
            mimeType: file.type,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            createdTime: new Date().toISOString(),
            dataUrl: reader.result as string
          };

          const currentPhotos = getLocalPhotos(currentShop.id);
          const updatedPhotos = [newPhoto, ...currentPhotos];
          saveLocalData(`photos_${currentShop.id}`, updatedPhotos);
          setPhotos(updatedPhotos);

          // Update dashboard image count & preview
          const db = getLocalDashboard(currentShop.id);
          db.imageCount = updatedPhotos.length;
          db.postingModeLabel = updatedPhotos.length >= 10 
            ? '画像ストック10枚以上: 画像連続投稿モード' 
            : `画像ストック${updatedPhotos.length}枚: 交互投稿モード`;
          db.postingMode = updatedPhotos.length >= 10 ? 'ALWAYS_IMAGE' : 'ALTERNATING';
          db.previewImage = updatedPhotos[0].dataUrl || null;
          saveLocalData(`dashboard_${currentShop.id}`, db);
          setDashboard(db);

          showBanner('success', `🎉 「${file.name}」をストックに直接追加しました。`);
        } catch (err) {
          showBanner('error', '画像のアップロードに失敗しました。');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }, 700);
    };
  };

  // Delete image from Google Drive (Mocked from localStorage)
  const handleDeleteImage = async (fileId: string, fileName: string) => {
    if (!currentShop) return;
    if (!confirm(`本当にこの写真「${fileName}」をストックから削除しますか？`)) return;

    setIsLoading(true);
    setTimeout(() => {
      try {
        const currentPhotos = getLocalPhotos(currentShop.id);
        const updatedPhotos = currentPhotos.filter(p => p.id !== fileId);
        saveLocalData(`photos_${currentShop.id}`, updatedPhotos);
        setPhotos(updatedPhotos);

        // Update dashboard image count & mode
        const db = getLocalDashboard(currentShop.id);
        db.imageCount = updatedPhotos.length;
        db.postingModeLabel = updatedPhotos.length >= 10 
          ? '画像ストック10枚以上: 画像連続投稿モード' 
          : `画像ストック${updatedPhotos.length}枚: 交互投稿モード`;
        db.postingMode = updatedPhotos.length >= 10 ? 'ALWAYS_IMAGE' : 'ALTERNATING';
        db.previewImage = updatedPhotos.length > 0 ? (updatedPhotos[0].dataUrl || null) : null;
        saveLocalData(`dashboard_${currentShop.id}`, db);
        setDashboard(db);

        showBanner('success', `🗑️ 写真「${fileName}」をストックから削除しました。`);
      } catch (err) {
        showBanner('error', '写真の削除に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  // Submit hand-edited AI generated review apology draft (Mocked)
  const [editingReplyText, setEditingReplyText] = useState<{ [key: string]: string }>({});

  const handleSendApology = async (reviewId: string) => {
    if (!currentShop) return;
    const replyText = editingReplyText[reviewId];

    if (!replyText || replyText.trim() === '') {
      alert('返信文面を入力してください。');
      return;
    }

    const matchingReview = reviews.find(r => r.review_id === reviewId);
    const isLowRating = matchingReview ? matchingReview.star_rating <= 2 : true;
    const successMsg = isLowRating
      ? '🟢 AIお詫び文を編集し、Googleマップ（GBP）に返信を送信しました！'
      : '🟢 AIお礼文を編集し、Googleマップ（GBP）に返信を送信しました！';

    setIsLoading(true);
    setTimeout(() => {
      try {
        const reviewLogs = getLocalReviews(currentShop.id);
        const idx = reviewLogs.findIndex(r => r.review_id === reviewId);
        if (idx !== -1) {
          reviewLogs[idx].reply_text = replyText;
          reviewLogs[idx].is_auto_replied = true;
          saveLocalData(`reviews_${currentShop.id}`, reviewLogs);
          setReviews(reviewLogs);
        }

        // Update dashboard pending reviews count
        const db = getLocalDashboard(currentShop.id);
        db.pendingReviewsCount = reviewLogs.filter(x => x.star_rating <= 2 && !x.is_auto_replied).length;
        saveLocalData(`dashboard_${currentShop.id}`, db);
        setDashboard(db);

        showBanner('success', successMsg);
      } catch (err) {
        showBanner('error', '返信の送信に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  // Save single draft post back to database (Mocked)
  const handleSaveDraft = async (dayIndex: number) => {
    if (!currentShop || !dashboard) return;
    
    setIsSavingDrafts(prev => ({ ...prev, [dayIndex]: true }));
    
    setTimeout(() => {
      try {
        const updatedDrafts = dashboard.draftPosts.map((d) => {
          if (d.dayIndex === dayIndex) {
            return {
              ...d,
              text: editingDraftText[dayIndex] !== undefined ? editingDraftText[dayIndex] : d.text
            };
          }
          return d;
        });

        const updatedDashboard = {
          ...dashboard,
          draftPosts: updatedDrafts
        };
        saveLocalData(`dashboard_${currentShop.id}`, updatedDashboard);
        setDashboard(updatedDashboard);
        
        setIsEditingDraft(prev => ({ ...prev, [dayIndex]: false }));
        showBanner('success', `✨ Day ${dayIndex} の下書きを保存しました。`);
      } catch (err) {
        showBanner('error', '下書きの保存に失敗しました。');
      } finally {
        setIsSavingDrafts(prev => ({ ...prev, [dayIndex]: false }));
      }
    }, 500);
  };

  // Regenerate single or all draft posts via Gemini API (Mocked in browser)
  const handleRegenerateDraft = async (dayIndex: number, all: boolean = false) => {
    if (!currentShop || !dashboard) return;

    if (all) {
      setIsRegeneratingAll(true);
    } else {
      setIsRegeneratingDraft(prev => ({ ...prev, [dayIndex]: true }));
    }

    setTimeout(async () => {
      try {
        const storeSettings = getLocalSettings(currentShop.id);
        const allPhotos = getLocalPhotos(currentShop.id);
        const savedApiKey = localStorage.getItem('demo_gemini_api_key') || 'SERVERLESS';
        let usedAI = false;

        const generateTextForDay = async (idx: number) => {
          if (savedApiKey) {
            try {
              const prompt = buildGeminiPostPrompt(currentShop.name, idx, storeSettings);
              const txt = await callGeminiAI(savedApiKey, prompt);
              usedAI = true;
              return txt;
            } catch (geminiErr) {
              console.warn(`Gemini call failed for Day ${idx}, using fallback:`, geminiErr);
              return generateFallbackPostText(idx, storeSettings.keywords.mainKeywords, storeSettings.keywords.subKeywords, storeSettings.keywords.fixedFooter, storeSettings.keywords.customPrompt);
            }
          } else {
            return generateFallbackPostText(idx, storeSettings.keywords.mainKeywords, storeSettings.keywords.subKeywords, storeSettings.keywords.fixedFooter, storeSettings.keywords.customPrompt);
          }
        };

        const pickImgForDay = (idx: number) => {
          if (allPhotos.length > 0) {
            return allPhotos[idx % allPhotos.length].id;
          }
          return null;
        };

        let nextDrafts = [...dashboard.draftPosts];

        if (all) {
          const text0 = await generateTextForDay(0);
          const text1 = await generateTextForDay(1);
          const text2 = await generateTextForDay(2);

          const publishedItem = nextDrafts.find((d: any) => d.dayIndex === -1);
          const activeDrafts = [
            { dayIndex: 0, title: '今日投稿予定の下書き (Day 0)', text: text0, subKeywords: storeSettings.keywords.subKeywords.slice(0, 2), imageFileId: pickImgForDay(0) },
            { dayIndex: 1, title: '明日投稿予定の下書き (Day 1)', text: text1, subKeywords: storeSettings.keywords.subKeywords.slice(2, 4), imageFileId: pickImgForDay(1) },
            { dayIndex: 2, title: '明後日投稿予定の下書き (Day 2)', text: text2, subKeywords: storeSettings.keywords.subKeywords.slice(0, 2), imageFileId: pickImgForDay(2) }
          ];

          nextDrafts = publishedItem ? [publishedItem, ...activeDrafts] : activeDrafts;
          setEditingDraftText({});
          setIsEditingDraft({});
          showBanner('success', `✨ ${usedAI ? '🔑 [リアルGemini AI]' : '🪄 [ローカル高精度AI]'} 3日先までのすべての下書きを再生成しました！`);
        } else {
          const targetIndex = typeof dayIndex === 'number' ? dayIndex : 0;
          const text = await generateTextForDay(targetIndex);
          const defaultTitles = [
            '今日投稿予定の下書き (Day 0)',
            '明日投稿予定の下書き (Day 1)',
            '明後日投稿予定の下書き (Day 2)'
          ];

          const draftObj = {
            dayIndex: targetIndex,
            title: defaultTitles[targetIndex] || `下書き (Day ${targetIndex})`,
            text,
            subKeywords: storeSettings.keywords.subKeywords.slice(0, 2),
            imageFileId: pickImgForDay(targetIndex)
          };

          const existingIdx = nextDrafts.findIndex((d: any) => d.dayIndex === targetIndex);
          if (existingIdx !== -1) {
            nextDrafts[existingIdx] = draftObj;
          } else {
            nextDrafts.push(draftObj);
          }
          nextDrafts.sort((a, b) => a.dayIndex - b.dayIndex);
          
          setEditingDraftText(prev => {
            const next = { ...prev };
            delete next[dayIndex];
            return next;
          });
          setIsEditingDraft(prev => ({ ...prev, [dayIndex]: false }));
          showBanner('success', `✨ ${usedAI ? '🔑 [リアルGemini AI]' : '🪄 [ローカル高精度AI]'} Day ${dayIndex} の下書きを再生成しました！`);
        }

        const updatedDashboard = {
          ...dashboard,
          draftPosts: nextDrafts
        };
        saveLocalData(`dashboard_${currentShop.id}`, updatedDashboard);
        setDashboard(updatedDashboard);
      } catch (err: any) {
        showBanner('error', 'AI下書きの再生成に失敗しました。');
      } finally {
        if (all) {
          setIsRegeneratingAll(false);
        } else {
          setIsRegeneratingDraft(prev => ({ ...prev, [dayIndex]: false }));
        }
      }
    }, 600);
  };

  // Regenerate/rewrite AI apology draft using custom directives (Mocked in browser)
  const handleRegenerateReply = async (reviewId: string, directiveText: string) => {
    if (!currentShop) return;
    setIsLoading(true);

    setTimeout(async () => {
      try {
        const savedApiKey = localStorage.getItem('demo_gemini_api_key') || 'SERVERLESS';
        const matchingReview = reviews.find(r => r.review_id === reviewId);
        if (!matchingReview) throw new Error('口コミが見つかりませんでした。');

        let newReplyText = '';
        let usedAI = false;

        if (savedApiKey) {
          try {
            const prompt = buildGeminiReviewPrompt(currentShop.name, matchingReview, currentShop.custom_review_prompt, directiveText);
            newReplyText = await callGeminiAI(savedApiKey, prompt);
            usedAI = true;
          } catch (geminiErr) {
            console.warn('Gemini call failed for review reply, using fallback:', geminiErr);
            newReplyText = generateFallbackReviewReply(matchingReview.star_rating, matchingReview.reviewer_name, directiveText);
          }
        } else {
          newReplyText = generateFallbackReviewReply(matchingReview.star_rating, matchingReview.reviewer_name, directiveText);
        }

        setEditingReplyText(prev => ({
          ...prev,
          [reviewId]: newReplyText,
        }));

        // Also save to database reviews array
        const reviewLogs = getLocalReviews(currentShop.id);
        const idx = reviewLogs.findIndex(r => r.review_id === reviewId);
        if (idx !== -1) {
          reviewLogs[idx].reply_text = newReplyText;
          saveLocalData(`reviews_${currentShop.id}`, reviewLogs);
          setReviews(reviewLogs);
        }

        const isLowRating = matchingReview.star_rating <= 2;
        const successMsg = isLowRating
          ? `🪄 ${usedAI ? '🔑 [リアルGemini]' : '🪄 [ローカル高精度AI]'} が指定指示に従ってお詫び文を書き直しました！`
          : `🪄 ${usedAI ? '🔑 [リアルGemini]' : '🪄 [ローカル高精度AI]'} が指定指示に従ってお礼文を書き直しました！`;
        showBanner('success', successMsg);
      } catch (err: any) {
        showBanner('error', '再生成に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    }, 800);
  };


  // Delete review log from list (Mocked)
  const handleDeleteReview = async (reviewId: string) => {
    if (!currentShop) return;
    if (!window.confirm('この口コミ履歴をデータベースから削除してもよろしいですか？\n(Googleマイビジネス側の実際の口コミは削除されません)')) return;

    setIsLoading(true);
    setTimeout(() => {
      try {
        const reviewLogs = getLocalReviews(currentShop.id);
        const nextReviews = reviewLogs.filter(r => r.review_id !== reviewId);
        saveLocalData(`reviews_${currentShop.id}`, nextReviews);
        setReviews(nextReviews);

        // Update dashboard count
        const db = getLocalDashboard(currentShop.id);
        db.pendingReviewsCount = nextReviews.filter(x => x.star_rating <= 2 && !x.is_auto_replied).length;
        saveLocalData(`dashboard_${currentShop.id}`, db);
        setDashboard(db);

        showBanner('success', '🗑️ 口コミ履歴を削除しました。');
      } catch (err) {
        showBanner('error', '口コミの削除に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };


  // loading screens
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium text-sm">セッションを同期中...</p>
      </div>
    );
  }

  // ==========================================
  // 🔓 Login Screen UI
  // ==========================================
  if (!token || !currentShop) {
    return (
      <div className="min-h-screen stripe-mesh flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
          <div className="flex justify-center mb-4">
            <img src="/logo_bk.png" alt="MEO SEIHA" className="h-16 w-auto object-contain drop-shadow-md" />
          </div>
          <p className="mt-2 text-xs text-indigo-100 font-bold tracking-widest uppercase opacity-90 drop-shadow-sm">
            全自動投稿＆AI口コミ返信システム
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white/95 border border-white/20 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 space-y-6">
            <h2 className="text-xl font-black text-stripeInk text-center border-b border-slate-100 pb-4">
              ログインアカウント
            </h2>

            {authError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-xs text-rose-800 leading-relaxed font-semibold">{authError}</span>
              </div>
            )}

            <form className="space-y-4.5" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-bold text-stripeInk-mute tracking-wider mb-1.5 uppercase">
                  メールアドレス
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-stripeInk-mute" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/60 placeholder-slate-400 text-sm text-stripeInk focus:outline-none focus:ring-2 focus:ring-stripeIndigo-500 focus:border-transparent transition-all"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stripeInk-mute tracking-wider mb-1.5 uppercase">
                  パスワード
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-stripeInk-mute" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/60 placeholder-slate-400 text-sm text-stripeInk focus:outline-none focus:ring-2 focus:ring-stripeIndigo-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-stripeIndigo-500 focus:ring-stripeIndigo-500 border-slate-200 bg-slate-50"
                  />
                  <span className="ml-2 text-xs text-stripeInk-secondary font-bold">次回から自動ログイン</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-stripeIndigo-500 hover:bg-stripeIndigo-600 text-white font-extrabold text-sm py-3 px-4 rounded-full shadow-md shadow-stripeIndigo-500/10 transition-all focus:outline-none active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'ログインする'
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Login Panel */}
            <div className="border-t border-slate-100 pt-5 mt-4 space-y-3">
              <div className="flex items-center justify-center gap-1 text-slate-400">
                <Sparkles className="w-4 h-4 text-stripeIndigo-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-stripeInk-mute">
                  デモ実演用・ID/PW自動入力
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('meoseiha@dairiten.x');
                    setPassword('meoseiha@dairiten.x');
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs py-3 px-4 rounded-xl transition-all active:scale-[0.98] border border-indigo-100 shadow-sm flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-[9px] font-bold opacity-75">代理店デモ</span>
                  <span>ID/PWを入力 ➔</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('meoseiha@avenir');
                    setPassword('meoseiha@avenir');
                  }}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs py-3 px-4 rounded-xl transition-all active:scale-[0.98] border border-emerald-100 shadow-sm flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-[9px] font-bold opacity-75">店舗デモ（美容室）</span>
                  <span>ID/PWを入力 ➔</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 👑 Master / Agency Account Contracted Shops List Screen (ADMIN / AGENCY)
  // ==========================================
  if (token && currentShop && (userRole === 'ADMIN' || userRole === 'AGENCY') && !isViewingShop) {
    // Group shopsList by agency name
    const groupedShops: { [agency: string]: ShopProfile[] } = {};
    const filteredShops = shopsList.filter(shop =>
      shop.name.toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
      shop.email.toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
      (shop.agency_name && shop.agency_name.toLowerCase().includes(shopSearchQuery.toLowerCase()))
    );

    filteredShops.forEach((shop) => {
      const agency = (!shop.agency_name || shop.agency_name.trim() === '' || shop.agency_name === 'THANXCREATE')
        ? 'THANXCREATE（直営店契約）'
        : shop.agency_name;
      
      if (!groupedShops[agency]) {
        groupedShops[agency] = [];
      }
      groupedShops[agency].push(shop);
    });

    // Sort agencies so that THANXCREATE is always first
    const sortedAgencies = Object.keys(groupedShops).sort((a, b) => {
      if (a.startsWith('THANXCREATE')) return -1;
      if (b.startsWith('THANXCREATE')) return 1;
      return a.localeCompare(b, 'ja-JP');
    });

    return (
      <div className="min-h-screen stripe-mesh flex flex-col justify-start py-8 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="max-w-4xl w-full mx-auto space-y-6">
          {/* Header Area */}
          <div className="flex items-center justify-between bg-white/95 border border-white/20 p-5 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3">
              <img src="/logo_bk.png" alt="MEO SEIHA" className="h-9 w-auto object-contain" />
              <div className="border-l border-slate-200 pl-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                  {userRole === 'ADMIN' ? 'MEO SEIHA マスターコントロール' : 'MEO SEIHA 代理店コントロール'}
                </p>
                <h1 className="text-sm font-black text-slate-900 leading-none mt-1.5">
                  {userRole === 'ADMIN' ? '契約店舗・代理店一覧' : '管理顧客店舗一覧'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 leading-none">
                  {userRole === 'ADMIN' ? `👑 ${currentShop.name}` : `🏢 ${currentShop.name}`}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 truncate max-w-[150px]">{currentShop.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                title="ログアウト"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar card */}
          <div className="bg-white/95 border border-white/20 rounded-3xl p-5 shadow-xl space-y-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">🔎 契約店舗を検索・絞り込み</h2>
            <div className="relative">
              <input
                type="text"
                value={shopSearchQuery}
                onChange={(e) => setShopSearchQuery(e.target.value)}
                placeholder="店舗名、メールアドレス、代理店名で検索..."
                className="block w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Hierarchy list */}
          <div className="space-y-4">
            {sortedAgencies.length === 0 ? (
              <div className="bg-white/95 border border-white/20 rounded-3xl py-12 px-4 text-center space-y-2 shadow-xl">
                <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-extrabold text-slate-700">該当する店舗が見つかりませんでした。</p>
              </div>
            ) : (
              sortedAgencies.map((agency) => {
                const shops = groupedShops[agency];
                const isExpanded = expandedAgencies[agency] !== false; // default to expanded

                return (
                  <div key={agency} className="bg-white/95 border border-white/20 rounded-3xl shadow-xl overflow-hidden transition-all">
                    {/* Agency Header row */}
                    <button
                      type="button"
                      onClick={() => setExpandedAgencies({
                        ...expandedAgencies,
                        [agency]: !isExpanded
                      })}
                      className={`w-full px-5 py-4 flex items-center justify-between text-left transition-colors ${
                        agency.startsWith('THANXCREATE') ? 'bg-indigo-50/50' : 'bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          agency.startsWith('THANXCREATE') ? 'bg-indigo-500' : 'bg-slate-500'
                        }`} />
                        <h2 className={`text-xs font-black uppercase tracking-wider ${
                          agency.startsWith('THANXCREATE') ? 'text-indigo-900' : 'text-slate-800'
                        }`}>
                          {agency.startsWith('THANXCREATE') ? '👑 直営：THANXCREATE' : `🏢 代理店：${agency}`}
                        </h2>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          agency.startsWith('THANXCREATE') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {shops.length}店舗
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-400">
                        {isExpanded ? '閉じる 🔼' : '開く 🔽'}
                      </span>
                    </button>

                    {/* Expandable Shops List */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 divide-y divide-slate-100 bg-white">
                        {shops.map((shop) => (
                          <div key={shop.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-50/50 transition-colors">
                            <div className="space-y-1">
                              <h3 className="text-xs font-black text-slate-900">{shop.name}</h3>
                              <p className="text-[10px] text-slate-400 font-bold">{shop.email}</p>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                shop.reply_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {shop.reply_active ? '自動返信: 作動中' : '自動返信: 停止中'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentShop(shop);
                                  setIsViewingShop(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] py-1.5 px-3.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
                              >
                                管理画面にアクセス ➔
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 📱 Admin Layout & Navigation (Mobile-first Dashboard)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-0">
      {/* 🧭 Global Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo_bk.png" alt="MEO SEIHA" className="h-7 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden md:block text-right">
            <p className="text-xs font-black text-slate-900 leading-tight">{currentShop.name}</p>
            <p className="text-[10px] text-slate-500 font-bold">
              {userRole === 'ADMIN' ? '👑 マスター管理者' : (userRole === 'AGENCY' ? '🏢 代理店管理者' : '店舗オーナー')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="ログアウト"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 📊 Message Notification Banner */}
      {messageBanner && (
        <div className={`fixed top-16 left-4 right-4 z-50 rounded-2xl border p-4 shadow-xl flex items-start gap-3 animate-bounce max-w-md mx-auto ${
          messageBanner.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {messageBanner.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-bold leading-relaxed">{messageBanner.text}</span>
        </div>
      )}

      {/* Wrapper to handle sidebar indentation for desktop/mobile layouts */}
      <div className="flex-1 flex flex-col sm:pl-60">
        {/* 🚀 Active Screen Container */}
        <main className="flex-1 max-w-md lg:max-w-6xl w-full mx-auto px-4 py-5 space-y-5">
          {/* Master / Agency Account Shop back button (Mobile) */}
          {(userRole === 'ADMIN' || userRole === 'AGENCY') && isViewingShop && (
            <button
              onClick={() => {
                setIsViewingShop(false);
                setDashboard(null);
                setSettings(null);
                setPhotos([]);
                setReviews([]);
              }}
              className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-xs font-black text-indigo-700 flex items-center justify-center gap-1.5 shadow-sm sm:hidden w-full no-print"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
              店舗一覧に戻る
            </button>
          )}

          {/* Master / Agency Account Shop Switcher (Mobile) */}
          {(userRole === 'ADMIN' || userRole === 'AGENCY') && shopsList.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 space-y-2 shadow-sm sm:hidden no-print">
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                {userRole === 'ADMIN' ? '👑 マスター店舗切替 (ADMIN)' : '🏢 代理店店舗切替 (AGENCY)'}
              </label>
              <div className="relative mt-1">
                <select
                  value={currentShop?.id || ''}
                  onChange={(e) => {
                    const targetShop = shopsList.find(s => s.id === e.target.value);
                    if (targetShop) {
                      setCurrentShop(targetShop);
                      showBanner('success', `「${targetShop.name}」のデータに切り替えました。`);
                    }
                  }}
                  className="block w-full border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  {shopsList.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-indigo-500">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
            </div>
          )}

        {/* 1️⃣ SCREEN: Dashboard */}
        {activeTab === 'dashboard' && (
          isLoading || !dashboard ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl py-16 px-4 text-center space-y-3 shadow-sm">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-xs font-extrabold text-slate-600">ダッシュボードを読み込み中...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:space-y-0 space-y-4 items-start">
              {/* Left Panel: Store Info, Status, Switches */}
              <div className="lg:col-span-5 space-y-4">
                {/* Store Title Board */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">現在管理中の店舗</p>
                    <h2 className="text-xl font-black text-slate-900 leading-tight mt-0.5">{dashboard.shopName}</h2>
                  </div>

                  {/* 📍 Quick Links */}
                  <div className="pt-1.5">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dashboard.shopName)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 p-3.5 rounded-xl transition-all flex items-center justify-between text-left group w-full"
                    >
                      <div>
                        <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-500 transition-colors uppercase block">Google Maps</span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">店舗を確認</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </a>
                  </div>
                </div>

                {/* CARD 3: Blink Emergency review alert banner */}
                {dashboard.pendingReviewsCount > 0 && (
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 rounded-2xl p-4 shadow-sm flex items-center justify-between text-left group animate-pulse transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      </span>
                    <div>
                      <h3 className="text-sm font-extrabold">🚨 緊急お詫び下書きの承認待ち</h3>
                      <p className="text-xs text-rose-700 font-bold mt-0.5">
                        星1・星2の低評価口コミが <span className="underline font-black text-sm">{dashboard.pendingReviewsCount}件</span> 届いています。
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-rose-700 bg-rose-100 group-hover:bg-rose-200 py-1.5 px-3 rounded-lg shrink-0 transition-all border border-rose-300">
                    今すぐ編集 ➔
                  </span>
                </button>
              )}

              {/* CARD 1: Scheduled Post Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5 uppercase">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    本日の自動投稿ステータス
                  </span>
                  <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    予約完了
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-4 text-xs font-bold">
                    <span className="text-slate-400 uppercase">次回投稿予定</span>
                    <span className="text-slate-900 text-right">{dashboard.nextPostTime}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4 text-xs font-bold border-t border-slate-50 pt-3">
                    <span className="text-slate-400 uppercase">動作最適化モード</span>
                    <span className="text-brandBlue-600 text-right max-w-[200px] leading-relaxed">
                      {dashboard.postingModeLabel}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 text-xs font-bold border-t border-slate-50 pt-3">
                    <span className="text-slate-400 uppercase">画像ストック状況</span>
                    <span className={`font-black text-right ${dashboard.imageCount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {dashboard.imageCount > 0 ? (dashboard.imageCount >= 1000 ? '1000枚（これ以上読み込めません）' : `${dashboard.imageCount}枚（画像自動連携中）`) : '0枚（テキストのみ投稿）'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 2: Toggle Switch Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5 uppercase">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    自動返信ステータス (星3〜★5のみ対象)
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    dashboard.replyActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {dashboard.replyActive ? '作動中' : '停止中'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">口コミ自動返信機能</h3>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed mt-0.5">
                      ONの場合、星3〜5の高評価に対して、1時間後にGemini AIが自動作成した最適な返信文で自動送信します。<br />
                      OFFの場合、星3〜5の高評価に対しても、低評価同様に店主様のLINEにAI返信下書きを通知し、承認後に送信します。
                    </p>
                  </div>

                  {/* Read-Only Status Toggle (Changeable via Settings Tab) */}
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-default rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        dashboard.replyActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          dashboard.replyActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">
                      ※設定タブで変更可能
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: 3-Day Editable Scheduled Drafts Panel */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  📅 3日先までのAI自動投稿・予約下書き
                </span>
                <button
                  type="button"
                  disabled={isRegeneratingAll}
                  onClick={() => handleRegenerateDraft(0, true)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black py-1.5 px-3 rounded-full transition-all flex items-center gap-1 border border-indigo-100 disabled:opacity-50"
                >
                  {isRegeneratingAll ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      一括作成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      3日分を一括作成 🪄
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                    {dashboard.draftPosts && dashboard.draftPosts.length > 0 ? (
                      dashboard.draftPosts.map((d) => {
                        const isEditing = !!isEditingDraft[d.dayIndex];
                        const isSaving = !!isSavingDrafts[d.dayIndex];
                        const isRegenerating = !!isRegeneratingDraft[d.dayIndex];
                        const currentText = editingDraftText[d.dayIndex] !== undefined ? editingDraftText[d.dayIndex] : d.text;

                        return (
                          <div key={d.dayIndex} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  d.dayIndex === -1
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : d.dayIndex === 0
                                    ? (dashboard.draftPosts.some(x => x.dayIndex === -1)
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                      : 'bg-rose-50 text-rose-700 border border-rose-100')
                                    : d.dayIndex === 1
                                    ? (dashboard.draftPosts.some(x => x.dayIndex === -1)
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-indigo-50 text-indigo-700 border border-indigo-100')
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {d.dayIndex === -1
                                    ? '本日投稿済み 🟢'
                                    : d.dayIndex === 0
                                    ? (dashboard.draftPosts.some(x => x.dayIndex === -1) ? '明日投稿予定' : '本日投稿予定')
                                    : d.dayIndex === 1
                                    ? (dashboard.draftPosts.some(x => x.dayIndex === -1) ? '明後日投稿予定' : '明日投稿予定')
                                    : (dashboard.draftPosts.some(x => x.dayIndex === -1) ? '明々後日投稿予定' : '明後日投稿予定')}
                                </span>
                                <h4 className="text-xs font-black text-slate-800 mt-1.5">
                                  {d.dayIndex === -1
                                    ? '本日投稿済みの下書き'
                                    : d.dayIndex === 0
                                    ? (dashboard.draftPosts.some(x => x.dayIndex === -1) ? '明日投稿予定の下書き (Day 0)' : '本日投稿予定の下書き (Day 0)')
                                    : d.dayIndex === 1
                                    ? (dashboard.draftPosts.some(x => x.dayIndex === -1) ? '明後日投稿予定の下書き (Day 1)' : '明日投稿予定の下書き (Day 1)')
                                    : (dashboard.draftPosts.some(x => x.dayIndex === -1) ? '明々後日投稿予定の下書き (Day 2)' : '明後日投稿予定の下書き (Day 2)')}
                                </h4>
                              </div>
                              
                              {d.subKeywords && d.subKeywords.length > 0 && (
                                <div className="text-right shrink-0 bg-indigo-50/50 border border-indigo-100/80 rounded-xl p-2 min-w-[90px] max-w-[120px]">
                                  <span className="text-[8px] font-black text-indigo-500 block border-b border-indigo-100/80 pb-0.5 mb-1 tracking-wider text-center">
                                    🔄 サブKW
                                  </span>
                                  <ul className="text-[8px] font-black text-indigo-600 space-y-0.5 text-left list-none leading-tight">
                                    {d.subKeywords.map((word, sIdx) => (
                                      <li key={sIdx} className="truncate" title={word}>
                                        ・{word}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                              {isEditing ? (
                                <textarea
                                  className="block w-full border border-slate-200 rounded-lg p-2.5 text-[11px] font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brandBlue-500 leading-normal min-h-[120px]"
                                  value={currentText}
                                  onChange={(e) => {
                                    setEditingDraftText({
                                      ...editingDraftText,
                                      [d.dayIndex]: e.target.value
                                    });
                                  }}
                                />
                              ) : (
                                <p className="text-[11px] font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">
                                  {d.text}
                                </p>
                              )}
                            </div>

                            {d.imageFileId && !isEditing && (
                              <div className="flex items-start gap-4 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5">
                                <div className="w-24 h-24 bg-slate-900/5 rounded-xl overflow-hidden border border-slate-200/60 shrink-0 shadow-sm">
                                  <img
                                    src={resolvePhotoUrl(d.imageFileId)}
                                    alt={d.dayIndex === -1 ? "投稿済みの写真" : "投稿予定の写真"}
                                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold space-y-1.5 pt-1">
                                  {d.dayIndex === -1 ? (
                                    <>
                                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100/60 px-2 py-0.5 rounded-full font-black">
                                        📸 投稿済みの写真
                                      </span>
                                      <p className="text-slate-700 font-extrabold text-[11px] leading-relaxed">
                                        この画像と一緒にGoogleマップへ公開されました。
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-normal leading-normal">
                                        店舗オーナー用のGoogle Driveストックから、自動的に最適な画像が使用されました。
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-[9px] bg-brandBlue-50 text-brandBlue-700 border border-brandBlue-100/60 px-2 py-0.5 rounded-full font-black">
                                        📸 投稿予定の写真
                                      </span>
                                      <p className="text-slate-700 font-extrabold text-[11px] leading-relaxed">
                                        この下書きと一緒にGoogleマップへ投稿されます。
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-normal leading-normal">
                                        店舗オーナー用のGoogle Driveストックから、自動的に最適な画像が割り振られています。
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsEditingDraft(prev => ({ ...prev, [d.dayIndex]: false }));
                                      setEditingDraftText(prev => {
                                        const next = { ...prev };
                                        delete next[d.dayIndex];
                                        return next;
                                      });
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all"
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleSaveDraft(d.dayIndex)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1"
                                  >
                                    {isSaving ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      '下書きを保存'
                                    )}
                                  </button>
                                </>
                              ) : d.dayIndex === -1 ? (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/80 py-1.5 px-3 rounded-lg">
                                  ✓ Googleマップへ正常に送信・公開されました
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={isRegenerating}
                                    onClick={() => handleRegenerateDraft(d.dayIndex, false)}
                                    className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1"
                                  >
                                    {isRegenerating ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 text-indigo-500" />
                                        AI再生成
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDraftText({
                                        ...editingDraftText,
                                        [d.dayIndex]: d.text
                                      });
                                      setIsEditingDraft(prev => ({ ...prev, [d.dayIndex]: true }));
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 px-3.5 rounded-lg transition-all"
                                  >
                                    手動編集
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 text-center space-y-1.5">
                        <AlertTriangle className="w-5 h-5 text-indigo-500 mx-auto" />
                        <p className="text-xs font-extrabold text-slate-800">下書きがありません</p>
                        <p className="text-[10px] text-slate-500 font-bold max-w-[240px] mx-auto leading-relaxed">
                          [3日分を一括作成] をタップして、Gemini AIで予約下書きを新規作成してください。
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 🚨 TEST BUTTON FOR ROLL-OVER */}
                  {dashboard.draftPosts && dashboard.draftPosts.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                          <h4 className="text-xs font-black text-slate-800">【開発デモ検証】毎日自動投稿シミュレーター</h4>
                        </div>
                        <span className="text-[8px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">DEV ONLY</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold leading-normal">
                        このボタンを押すと、「本日（Day 0）」の下書きがGoogleマップへ実際に送信されます（接続前は疑似送信）。その後、下書きが1日分スライドし、新しく空いた明後日分（Day 2）にGemini AIが自動投稿文を新規生成します。
                      </p>
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={handleSimulateRollover}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] py-2 px-3 rounded-lg shadow transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        {isToggling ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            本日分を自動投稿して下書きをスライド（ロールオーバー）する 🚀
                          </>
                        )}
                      </button>

                      {dashboard.draftPosts.some((d: any) => d.dayIndex === -1) && (
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={handleClearPublished}
                          className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[10px] py-2 px-3 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 mt-2"
                        >
                          {isToggling ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              「本日投稿済み」カードを強制リセット（JST日付変更をシミュレート） 🧹
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
            </div>
          </div>
        )
      )}

        {/* 2️⃣ SCREEN: Photos (Google Drive Image Manager) */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-brandBlue-600" />
                画像ストック管理 (Google Drive)
              </h2>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                店舗の専用Google Driveフォルダと双方向でリアルタイム同期。
                ここから追加した写真は自動的にストックされ、MEO自動投稿のローテーションで使用されます。
              </p>

              {/* Upload action box */}
              <div className="pt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png"
                  className="hidden"
                />
                <button
                  onClick={handleImageUploadClick}
                  disabled={isUploading}
                  className="w-full bg-brandBlue-50 hover:bg-brandBlue-100 border border-brandBlue-200 text-brandBlue-700 font-extrabold text-xs py-3 px-4 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      写真をアップロード追加する (JPEG/PNG)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Photos Grid */}
            <div className="space-y-2.5">
              <span className="text-xs font-black text-slate-400 block uppercase tracking-wider">
                現在のストック写真一覧 ({photos.length >= 1000 ? '1000枚 - これ以上読み込めません' : `${photos.length}枚`})
              </span>

              {isLoading ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl py-12 px-4 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                  <p className="text-xs font-extrabold text-slate-600">Google Driveから写真を同期中...</p>
                </div>
              ) : photos.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl py-12 px-4 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">写真がありません</p>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-[200px] mx-auto">
                    上のボタンから最初の1枚をアップロードしてください。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative">
                      <div className="aspect-square bg-slate-900/5 relative flex items-center justify-center overflow-hidden border-b border-slate-100">
                        <img
                          src={resolvePhotoUrl(photo.id || photo.dataUrl)}
                          alt={photo.name}
                          className="object-cover w-full h-full"
                        />
                        <button
                          onClick={() => handleDeleteImage(photo.id, photo.name)}
                          className="absolute bottom-2 right-2 p-2 bg-slate-950/80 text-rose-400 hover:text-rose-500 rounded-xl transition-all"
                          title="画像を削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-2.5 space-y-0.5 text-[10px] leading-tight font-bold">
                        <p className="text-slate-900 truncate" title={photo.name}>{photo.name}</p>
                        <p className="text-slate-400 uppercase">{photo.size || '容量不明'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3️⃣ SCREEN: Settings */}
        {activeTab === 'settings' && (
          isLoading || !settings ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl py-16 px-4 text-center space-y-3 shadow-sm">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-xs font-extrabold text-slate-600">自動投稿・返信設定を読み込み中...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4">

            {/* CARD: Toggle Switch Card for Auto-reply inside Settings */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5 uppercase">
                  <span className={`w-2.5 h-2.5 rounded-full ${settings.replyActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  自動返信ステータス (星3〜★5のみ対象)
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  settings.replyActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {settings.replyActive ? '作動中' : '停止中'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">口コミ自動返信機能</h3>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed mt-0.5">
                    ONの場合、星3〜5の高評価に対して、1時間後に登録済みの定型文からランダムに自動送信します。
                  </p>
                </div>

                {/* Smooth Animated Toggle */}
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, replyActive: !settings.replyActive })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.replyActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.replyActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Auto post settings */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                AI自動投稿・キーワード設定
              </h2>

              {/* Daily Posting Hour Dropdown */}
              <div className="space-y-1.5 border-b border-slate-100/80 pb-4">
                <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  毎日自動投稿の時間帯
                </label>
                <p className="text-[9px] text-slate-400 leading-normal font-bold">
                  おしらせがGoogleマップ（GBP）へ自動公開される時間帯を1時間単位で設定できます。（デフォルト：12時）
                </p>
                <div className="relative">
                  <select
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 appearance-none cursor-pointer"
                    value={settings.keywords.postTimeHour !== undefined ? settings.keywords.postTimeHour : 12}
                    onChange={(e) => setSettings({
                      ...settings,
                      keywords: { ...settings.keywords, postTimeHour: parseInt(e.target.value, 10) }
                    })}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}:00 頃
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Main Keywords */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  メインキーワード (毎回必ず含める5つ)
                </label>
                <p className="text-[9px] text-slate-400 leading-normal font-bold">
                  MEOの主要KWを登録してください。AIが自然に投稿へ組み込みます。
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <input
                      key={`main-${idx}`}
                      type="text"
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500"
                      placeholder={`キーワード ${idx + 1}`}
                      value={settings.keywords.mainKeywords[idx] || ''}
                      onChange={(e) => {
                        const updated = [...settings.keywords.mainKeywords];
                        updated[idx] = e.target.value;
                        setSettings({
                          ...settings,
                          keywords: { ...settings.keywords, mainKeywords: updated }
                        });
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Sub Keywords */}
              <div className="space-y-1.5 border-t border-slate-50 pt-3">
                <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  サブキーワード (毎回ランダムに2〜3語含める)
                </label>
                <p className="text-[9px] text-slate-400 leading-normal font-bold">
                  KWのプールから自動で異なる組み合わせをローテーションします。
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
                    <input
                      key={`sub-${idx}`}
                      type="text"
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500"
                      placeholder={`サブKW ${idx + 1}`}
                      value={settings.keywords.subKeywords[idx] || ''}
                      onChange={(e) => {
                        const updated = [...settings.keywords.subKeywords];
                        updated[idx] = e.target.value;
                        setSettings({
                          ...settings,
                          keywords: { ...settings.keywords, subKeywords: updated }
                        });
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Store unique prompt custom_prompt */}
              <div className="space-y-1.5 border-t border-slate-50 pt-3">
                <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  店舗固有のAI投稿プロンプト (`custom_prompt`)
                </label>
                <p className="text-[9px] text-slate-400 leading-normal font-bold">
                  自店舗ならではの強み、ターゲット、トーン＆マナーを指定してください。
                </p>
                <textarea
                  className="block w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 leading-relaxed min-h-[90px]"
                  placeholder="例：上品で落ち着いた雰囲気。トリートメント、美髪ケアについて強調してください。"
                  value={settings.keywords.customPrompt}
                  onChange={(e) => setSettings({
                    ...settings,
                    keywords: { ...settings.keywords, customPrompt: e.target.value }
                  })}
                />
              </div>

              {/* Fixed Footer Sign */}
              <div className="space-y-1.5 border-t border-slate-50 pt-3">
                <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  固定署名 (フッター文面)
                </label>
                <p className="text-[9px] text-slate-400 leading-normal font-bold">
                  投稿文の最後に自動で付与されます（住所、営業時間等）。
                </p>
                <textarea
                  className="block w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 leading-relaxed min-h-[80px]"
                  placeholder="店舗名: Avenir Hair 栄店&#10;住所: 名古屋市中区錦3丁目&#10;電話: 052-XXX-XXXX"
                  value={settings.keywords.fixedFooter}
                  onChange={(e) => setSettings({
                    ...settings,
                    keywords: { ...settings.keywords, fixedFooter: e.target.value }
                  })}
                />
              </div>

              {/* HP URL and GBP Action Button settings */}
              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-50 pt-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                    店舗ホームページURL (HP)
                  </label>
                  <p className="text-[9px] text-slate-400 leading-normal font-bold">
                    最新サービス情報等をAIが自動参照します。
                  </p>
                  <input
                    type="url"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500"
                    placeholder="https://thanx-create.com"
                    value={settings.keywords.hpUrl || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      keywords: { ...settings.keywords, hpUrl: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                    GBP投稿「詳細」ボタンURL
                  </label>
                  <p className="text-[9px] text-slate-400 leading-normal font-bold">
                    投稿ボタンに設定する、LPやキャンペーンのURLです。
                  </p>
                  <input
                    type="url"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500"
                    placeholder="https://thanx-create.com/lp-meo"
                    value={settings.keywords.gbpActionUrl || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      keywords: { ...settings.keywords, gbpActionUrl: e.target.value }
                    })}
                  />
                </div>
              </div>

              {/* 3 Major Portals Settings */}
              <div className="border-t border-slate-50 pt-4 space-y-3">
                <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  ポータルサイト連携URL (任意)
                </label>
                <p className="text-[9px] text-slate-400 leading-normal font-bold">
                  ホットペッパーや食べログ等のポータルの最新の口コミや掲載メニューをAIに学習させます。
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-500">ポータルサイトURL①</span>
                    <input
                      type="url"
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500"
                      placeholder="https://tabelog.com/aichi/..."
                      value={settings.keywords.tabelogUrl || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        keywords: { ...settings.keywords, tabelogUrl: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-500">ポータルサイトURL②</span>
                    <input
                      type="url"
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500"
                      placeholder="https://beauty.hotpepper.jp/slnH..."
                      value={settings.keywords.hotpepperUrl || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        keywords: { ...settings.keywords, hotpepperUrl: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-500">ポータルサイトURL③</span>
                    <input
                      type="url"
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500"
                      placeholder="https://r.gnavi.co.jp/..."
                      value={settings.keywords.gurunaviUrl || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        keywords: { ...settings.keywords, gurunaviUrl: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD: LINE Notification Auto-Pairing */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                低評価アラート通知先 LINE連携
              </h2>

              <div className="space-y-3.5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                    現在の登録LINEユーザーID（最大3名）
                  </label>
                  {(() => {
                    const registeredIds = settings.lineUserId ? settings.lineUserId.split(',').map(id => id.trim()).filter(Boolean) : [];
                    
                    if (registeredIds.length === 0) {
                      return (
                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-rose-500 font-extrabold flex items-center justify-center gap-1">
                            <span>●</span> LINE IDが未設定のため、アラートは送信されません。
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {registeredIds.map((id, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-indigo-500 uppercase">
                                連携先 {idx + 1}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-slate-700 mt-0.5">
                                {id}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newIds = registeredIds.filter((_, i) => i !== idx);
                                setSettings({
                                  ...settings,
                                  lineUserId: newIds.join(',')
                                });
                                showBanner('success', `連携先 ${idx + 1} を削除しました。設定を保存すると確定します。`);
                              }}
                              className="text-[10px] font-black text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg py-1 px-2.5 transition-all"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                        <p className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 pt-1">
                          <span>●</span> 現在、上記のID宛てに低評価口コミの緊急LINEアラートが届きます。
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="border-t border-slate-100 pt-3.5 space-y-3.5">
                  <span className="block text-[11px] font-black text-slate-700 tracking-wider uppercase">
                    📱 かんたん自動LINE連携 (セルフ登録)
                  </span>

                  <div className="flex md:flex-row flex-col gap-4 items-center bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {/* QR Code */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shrink-0 shadow-sm flex flex-col items-center justify-center">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://lin.ee/oNC33Rq"
                        alt="LINE QR"
                        className="w-[100px] h-[100px]"
                      />
                      <span className="text-[8px] font-black text-slate-400 tracking-widest mt-1.5 uppercase">MEO SEIHA 公式</span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-bold space-y-1.5">
                      <p className="text-slate-800 font-extrabold text-[11px] leading-relaxed">
                        【ステップ1】
                      </p>
                      <p className="leading-relaxed">
                        上記のQRコードをスマートフォンでスキャンし、**「MEO SEIHA公式LINEアカウント」を友だち追加**してください。
                      </p>
                      <p className="text-slate-800 font-extrabold text-[11px] leading-relaxed pt-0.5">
                        【ステップ2】
                      </p>
                      <p className="leading-relaxed">
                        友だち追加後、その公式LINE宛てに**スタンプまたは適当な一言メッセージを送信**してください。
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold leading-normal">
                      【ステップ3】メッセージ送信後、以下のボタンを押してご自身のアカウントを自動検出してください。
                    </p>
                    <button
                      type="button"
                      disabled={isDetectingLine}
                      onClick={handleDetectLineSenders}
                      className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      {isDetectingLine ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                          LINE送信者を自動検出する
                        </>
                      )}
                    </button>

                    {recentSenders.length > 0 && (
                      <div className="border border-indigo-100 rounded-xl bg-indigo-50/50 p-3 space-y-2 animate-fadeIn">
                        <label className="block text-[9px] font-black text-indigo-500 uppercase tracking-wider leading-none">
                          🌟 検出された直近の送信者 (15分以内)
                        </label>
                        <p className="text-[9px] text-slate-400 leading-normal font-bold">
                          ご自身のアカウント（ニックネーム）を見つけたら、ボタンを押して連携してください。
                        </p>
                        <div className="divide-y divide-indigo-100/50 max-h-[140px] overflow-y-auto pr-1">
                          {recentSenders.map((sender) => (
                            <div key={sender.userId} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                              <div>
                                <span className="text-xs font-black text-slate-800 block">
                                  {sender.displayName} 様
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  ID: {sender.userId.substring(0, 10)}...
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const registeredIds = settings.lineUserId ? settings.lineUserId.split(',').map(id => id.trim()).filter(Boolean) : [];
                                  if (registeredIds.includes(sender.userId)) {
                                    showBanner('error', 'このアカウントは既に登録されています。');
                                    return;
                                  }
                                  if (registeredIds.length >= 3) {
                                    showBanner('error', '連携先は最大3名まで登録可能です。不要な連携先を削除してから追加してください。');
                                    return;
                                  }
                                  const newIds = [...registeredIds, sender.userId];
                                  setSettings({
                                    ...settings,
                                    lineUserId: newIds.join(',')
                                  });
                                  showBanner('success', `連携先に「${sender.displayName} 様」を追加しました。設定を保存すると登録が確定します。`);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold py-1.5 px-3 rounded-lg transition-all"
                              >
                                このアカウントで連携する
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Review Apology Guidelines Form */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  口コミ返信プロンプト・LINEテスト
                </h2>
                <button
                  type="button"
                  onClick={handleTestLineAlert}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold text-[10px] py-1.5 px-3 rounded-lg shrink-0 transition-all flex items-center gap-1 active:scale-[0.98]"
                >
                  <Send className="w-3 h-3" />
                  LINEテスト送信
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 tracking-wider uppercase">
                  低評価口コミお詫び文の追加指示プロンプト
                </label>
                <p className="text-[9px] text-slate-400 leading-normal font-bold">
                  星1・2検知時のAI謝罪下書きの文調、アピールしたい店舗特性を指示。
                </p>
                <textarea
                  className="block w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 leading-relaxed min-h-[100px]"
                  placeholder="例：高級サロンにふさわしい最高に上品な言葉遣いで。お叱りには深く寄り添いつつ、カウンセリング教育を徹底する姿勢を誠意を込めてアピールしてください。"
                  value={settings.customReviewPrompt}
                  onChange={(e) => setSettings({
                    ...settings,
                    customReviewPrompt: e.target.value
                  })}
                />
              </div>

              {/* Demo Gemini API Key Setting Card */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4.5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
                  <h3 className="text-xs font-black text-amber-900 leading-none">【デモ実演用】Gemini AI 連携設定</h3>
                </div>
                <p className="text-[9px] text-amber-700 leading-normal font-bold">
                  デモでリアルタイムなAI生成（Gemini API）をご利用になる場合は、お持ちの Gemini API キーを入力してください。<br />
                  キーは暗号化されず、ブラウザの localStorage にのみ安全に保存されます。<br />
                  ※APIキーが未入力の場合は、自動的に美容室テーマの「高品質ローカルAIテキスト生成（フォールバック）」が動作するため、キーがなくても完全に動作します。
                </p>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-amber-800 tracking-wider uppercase">
                    Gemini API キー (AI-KEY)
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={localStorage.getItem('demo_gemini_api_key') || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        localStorage.setItem('demo_gemini_api_key', val);
                      } else {
                        localStorage.removeItem('demo_gemini_api_key');
                      }
                      // trigger state refresh
                      setSettings({ ...settings });
                    }}
                    className="block w-full border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-amber-200"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="pt-2 no-print">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brandBlue-600 hover:bg-brandBlue-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4.5 h-4.5" />
                    設定を保存する
                  </>
                )}
              </button>
            </div>
          </form>
        )
      )}

        {/* 4️⃣ SCREEN: Review Logs & AI apology list */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brandBlue-600" />
                口コミ・返信下書き管理
              </h2>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                新着の低評価（★1・★2）は自動送信されず、AIが作成した謝罪文をこの画面で安全に編集・承認して送信できます。高評価（★3〜5）は自動ランダム返信ログが表示されます。
              </p>
            </div>

            {/* List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl py-12 px-4 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                  <p className="text-xs font-extrabold text-slate-600">Googleマイビジネスから口コミを同期中...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl py-12 px-4 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">口コミ履歴がありません</p>
                </div>
              ) : (
                [...reviews]
                  .sort((a, b) => {
                    const aPending = !a.is_auto_replied;
                    const bPending = !b.is_auto_replied;

                    // 1. 未返信（承認待ち）の口コミを最優先で一番上に表示
                    if (aPending && !bPending) return -1;
                    if (!aPending && bPending) return 1;

                    // 2. 両方が未返信（承認待ち）の場合：古いものほど上（昇順 / ASC）
                    if (aPending && bPending) {
                      return new Date(a.create_time).getTime() - new Date(b.create_time).getTime();
                    }

                    // 3. 両方が返信済みの場合：新しいものほど上（降順 / DESC）
                    return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
                  })
                  .map((review: ReviewLog) => {
                    const isPendingReply = !review.is_auto_replied;

                    // Sync local text input state dynamically
                    if (isPendingReply && editingReplyText[review.review_id] === undefined) {
                      editingReplyText[review.review_id] = review.reply_text || '';
                    }

                  return (
                    <div
                      key={review.id}
                      className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 transition-all ${
                        isPendingReply 
                          ? (review.star_rating <= 2 ? 'border-rose-200 bg-rose-50/10' : 'border-indigo-200 bg-indigo-50/10') 
                          : 'border-slate-200/80'
                      }`}
                    >
                      {/* Customer post header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-900">{review.reviewer_name}様</span>
                            <span className="text-[9px] text-slate-400 font-bold">{new Date(review.create_time).toLocaleDateString()}</span>
                          </div>
                          {/* Star Ratings representation */}
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={`star-${star}`}
                                className={`text-base leading-none select-none ${
                                  star <= review.star_rating ? 'text-amber-400' : 'text-slate-200'
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Status label tag and action buttons */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isPendingReply
                              ? (review.is_pre_integration
                                ? 'bg-slate-100 text-slate-700 border border-slate-300 animate-pulse'
                                : (review.star_rating <= 2
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                                  : (dashboard?.replyActive
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200 animate-pulse'
                                  )
                                )
                              )
                              : (review.is_pre_integration
                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                : (review.star_rating >= 3
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                )
                              )
                          }`}>
                            {isPendingReply
                              ? (review.is_pre_integration
                                ? '導入前未返信'
                                : (review.star_rating <= 2
                                  ? '承認待ち (保留中)'
                                  : (dashboard?.replyActive
                                    ? '自動送信待ち (1時間後)'
                                    : '承認待ち (保留中)'
                                  )
                                )
                              )
                              : (review.is_pre_integration
                                ? '導入前返信済'
                                : (review.star_rating >= 3 ? '自動送信完了' : '手動送信完了')
                              )
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.review_id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="口コミ履歴を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Customer Review comment */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5">
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">
                          「{review.comment || '(本文なし。評価のみ)'}」
                        </p>
                      </div>

                      {/* Reply Area */}
                      {isPendingReply ? (
                        /* Manual check + editor (AI draft) */
                        <div className={`space-y-3.5 border-t border-dashed pt-3.5 ${
                          review.star_rating <= 2 ? 'border-rose-200' : 'border-indigo-200'
                        }`}>
                          <div className={`flex items-center gap-1 text-[11px] font-black uppercase ${
                            review.star_rating <= 2 ? 'text-rose-700' : 'text-indigo-700'
                          }`}>
                            <Sparkles className={`w-4 h-4 ${review.star_rating <= 2 ? 'text-rose-500 fill-rose-50' : 'text-indigo-500 fill-indigo-50'}`} />
                            {review.star_rating <= 2 ? 'AI作成されたお詫び文下書き (編集可能)' : 'AI作成された返信文下書き (編集可能)'}
                          </div>
                          <textarea
                            className={`block w-full border rounded-xl p-3.5 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 leading-relaxed min-h-[120px] ${
                              review.star_rating <= 2 ? 'border-rose-200 focus:ring-rose-500' : 'border-indigo-200 focus:ring-indigo-500'
                            }`}
                            value={editingReplyText[review.review_id] || ''}
                            onChange={(e) => {
                              setEditingReplyText({
                                ...editingReplyText,
                                [review.review_id]: e.target.value
                              });
                            }}
                          />

                          {/* 🪄 AI Rewrite Presets and custom directive input */}
                          <div className="flex flex-col gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-50" />
                              🪄 トーンを指定してAIで書き直す
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRegenerateReply(review.review_id, review.star_rating <= 2 ? 'より丁寧でフォーマルな謝罪文にしてください。' : 'より丁寧でフォーマルな感謝・アピール返信文にしてください。')}
                                disabled={isLoading}
                                className="bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all active:scale-[0.97] flex items-center gap-1"
                              >
                                💼 よりフォーマル
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerateReply(review.review_id, review.star_rating <= 2 ? '150文字以内の非常に簡潔なお詫び文にまとめてください。' : '150文字以内の非常に簡潔なお礼文にまとめてください。')}
                                disabled={isLoading}
                                className="bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all active:scale-[0.97] flex items-center gap-1"
                              >
                                ⚡ 短く簡潔に
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerateReply(review.review_id, review.star_rating <= 2 ? 'お客様への真摯な謝罪に加え、今後の技術指導や接客カウンセリング教育を早急に徹底する改善姿勢を強調してください。' : '店舗のアピールポイント、温かい感謝、そして定期的なメンテナンスのご案内をアピールして書き直してください。')}
                                disabled={isLoading}
                                className="bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all active:scale-[0.97] flex items-center gap-1"
                              >
                                🔧 改善・魅力アピール
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                type="text"
                                id={`custom-directive-${review.review_id}`}
                                placeholder={review.star_rating <= 2 ? '例: もっと親しみやすく、技術面についてお詫びして' : '例: メニューの強みをもっと前面に出して明るくお礼して'}
                                className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const target = e.currentTarget;
                                    if (target.value.trim() !== '') {
                                      handleRegenerateReply(review.review_id, target.value);
                                      target.value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`custom-directive-${review.review_id}`) as HTMLInputElement;
                                  if (input && input.value.trim() !== '') {
                                    handleRegenerateReply(review.review_id, input.value);
                                    input.value = '';
                                  }
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm"
                              >
                                指示する
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSendApology(review.review_id)}
                            disabled={isLoading}
                            className={`w-full text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 no-print ${
                              review.star_rating <= 2 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            {isLoading ? (
                              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                {review.star_rating <= 2 ? 'お詫び文を承認して送信する' : '返信文を承認して送信する'}
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        /* Past complete replied logs represent */
                        <div className="space-y-2 border-t border-slate-100 pt-3 text-[11px] leading-relaxed">
                          <span className="font-black text-slate-400 uppercase">返信済みの文面:</span>
                          <p className="bg-slate-50/50 border border-slate-200/40 rounded-xl p-3 font-bold text-slate-600">
                            {review.reply_text || '未返信'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* 📱 Mobile Sticky Navigation Bar (Mobile-first Navigation tab switcher) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-4 py-2 shadow-lg flex items-center justify-around sm:hidden no-print">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-brandBlue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <LayoutDashboard className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">ホーム</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'photos' ? 'text-brandBlue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ImageIcon className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">写真管理</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
            activeTab === 'reviews' ? 'text-brandBlue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <MessageSquare className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">口コミ</span>
          {dashboard && dashboard.pendingReviewsCount > 0 && (
            <span className="absolute top-0.5 right-3 w-4 h-4 bg-rose-500 border border-white text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {dashboard.pendingReviewsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'settings' ? 'text-brandBlue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">設定</span>
        </button>
      </nav>

      {/* 🖥️ Desktop sidebar or global side menu for wide monitors */}
      <aside className="hidden sm:flex fixed top-16 left-0 bottom-0 w-60 bg-white border-r border-slate-200/80 p-4 flex-col justify-between shadow-sm z-30 no-print">
        <div className="space-y-2">
          {/* Master / Agency Account back button */}
          {(userRole === 'ADMIN' || userRole === 'AGENCY') && (
            <button
              onClick={() => {
                setIsViewingShop(false);
                setDashboard(null);
                setSettings(null);
                setPhotos([]);
                setReviews([]);
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center gap-3 transition-all bg-indigo-50 border border-indigo-100/60 text-indigo-700 hover:bg-indigo-100 mb-2 shadow-sm"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
              店舗一覧に戻る
            </button>
          )}

          {/* Master / Agency Account Shop Switcher (Desktop) */}
          {(userRole === 'ADMIN' || userRole === 'AGENCY') && shopsList.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 space-y-2 mb-4 shadow-sm">
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                {userRole === 'ADMIN' ? '👑 マスター店舗切替 (ADMIN)' : '🏢 代理店店舗切替 (AGENCY)'}
              </label>
              <div className="relative mt-1">
                <select
                  value={currentShop?.id || ''}
                  onChange={(e) => {
                    const targetShop = shopsList.find(s => s.id === e.target.value);
                    if (targetShop) {
                      setCurrentShop(targetShop);
                      showBanner('success', `「${targetShop.name}」のデータに切り替えました。`);
                    }
                  }}
                  className="block w-full border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  {shopsList.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-indigo-500">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center gap-3 transition-all ${
              activeTab === 'dashboard'
                ? 'bg-brandBlue-500 text-white shadow-md shadow-brandBlue-500/15'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            ダッシュボード
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
              activeTab === 'photos'
                ? 'bg-brandBlue-500 text-white shadow-md shadow-brandBlue-500/15'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-4.5 h-4.5" />
              画像ストック管理
            </div>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
              activeTab === 'reviews'
                ? 'bg-brandBlue-500 text-white shadow-md shadow-brandBlue-500/15'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4.5 h-4.5" />
              口コミ・AIお詫び文
            </div>
            {dashboard && dashboard.pendingReviewsCount > 0 && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeTab === 'reviews' ? 'bg-white text-brandBlue-600' : 'bg-rose-500 text-white animate-pulse'
              }`}>
                {dashboard.pendingReviewsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center gap-3 transition-all ${
              activeTab === 'settings'
                ? 'bg-brandBlue-500 text-white shadow-md shadow-brandBlue-500/15'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4.5 h-4.5" />
            自動投稿＆返信設定
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
            {userRole === 'ADMIN' ? '👑 マスターアカウント' : (userRole === 'AGENCY' ? '🏢 代理店アカウント' : 'ログインアカウント')}
          </p>
          <p className="text-xs font-black text-slate-800 leading-tight pt-1 truncate" title={currentShop.name}>{currentShop.name}</p>
          <p className="text-[9px] text-slate-400 font-bold truncate" title={currentShop.email}>{currentShop.email}</p>
        </div>
      </aside>
    </div>
  );
}
