
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendNotification = internalAction({
    args: {
        type: v.string(), // 'rental', 'subscription', 'greenRemodeling'
        name: v.string(),
        phone: v.string(),
        selectedAmount: v.string(),
        address: v.string(),
        isDraft: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) return;

        let title = '';
        let color = 0x2c3e50;

        const draftSuffix = args.isDraft ? ' (임시저장)' : '';

        if (args.type === 'subscription') {
            title = `🏠 스마트 구독 서비스(할부) 신청${draftSuffix}`;
            color = args.isDraft ? 0x95a5a6 : 0x1a3a3a;
        } else if (args.type === 'rental') {
            title = `🛡️ 렌탈 서비스 신청${draftSuffix}`;
            color = args.isDraft ? 0x95a5a6 : 0x2c3e50;
        } else if (args.type === 'greenRemodeling') {
            title = `🌿 그린리모델링 신청${draftSuffix}`;
            color = args.isDraft ? 0x95a5a6 : 0x27ae60;
        } else {
            title = `🔔 알림: ${args.type}${draftSuffix}`;
        }

        const content = {
            embeds: [
                {
                    title: title,
                    color: color,
                    fields: [
                        { name: '👤 고객명', value: args.name, inline: true },
                        { name: '📞 연락처', value: args.phone, inline: true },
                        { name: '💰 신청내용', value: args.selectedAmount, inline: true },
                        { name: '📍 주소', value: args.address || '정보 없음' },
                        { name: '🕒 발생일시', value: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) },
                    ],
                    footer: { text: 'KCC 견적계산(책임견적) 어드민' }
                }
            ]
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(content),
            });
        } catch (error) {
            console.error('Discord notification failed:', error);
        }
    },
});
