import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase/config';

/**
 * ChannelManager Singleton
 * Brinda a aplicação contra o erro "cannot add postgres_changes callbacks... after subscribe()"
 * garantindo que cada canal seja gerenciado de forma atômica e serializada.
 */
class ChannelManager {
    private static instance: ChannelManager;
    private channels: Map<string, RealtimeChannel> = new Map();
    private subscriptionStatus: Map<string, 'SUBSCRIBING' | 'SUBSCRIBED' | 'UNSUBSCRIBING'> = new Map();

    private constructor() { }

    public static getInstance(): ChannelManager {
        if (!ChannelManager.instance) {
            ChannelManager.instance = new ChannelManager();
        }
        return ChannelManager.instance;
    }

    /**
     * Subscreve em um canal de forma segura.
     * Se o canal já existir ou estiver em processo, evita duplicidade.
     */
    public subscribe(
        channelId: string,
        tableName: string,
        onEvent: (payload: any) => void,
        config: { event: string, schema: string } = { event: '*', schema: 'public' }
    ) {
        // Se já estamos inscritos ou inscrevendo neste ID exato, não fazemos nada
        if (this.subscriptionStatus.has(channelId)) {
            return;
        }

        this.subscriptionStatus.set(channelId, 'SUBSCRIBING');

        // IMPORTANTE: Criamos o canal e configuramos os filtros ANTES do .subscribe()
        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes' as any,
                {
                    event: config.event,
                    schema: config.schema,
                    table: tableName
                },
                (payload) => {
                    // Só executa se ainda estivermos inscritos
                    if (this.subscriptionStatus.get(channelId) === 'SUBSCRIBED') {
                        onEvent(payload);
                    }
                }
            );

        // Armazenamos antes para o caso de o status mudar muito rápido
        this.channels.set(channelId, channel);

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                this.subscriptionStatus.set(channelId, 'SUBSCRIBED');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn(`Realtime error on ${channelId}:`, status);
                this.subscriptionStatus.delete(channelId);
                this.channels.delete(channelId);
            }
        });
    }

    /**
     * Remove a inscrição de um canal e limpa o estado.
     */
    public async unsubscribe(channelId: string) {
        const channel = this.channels.get(channelId);
        if (channel) {
            this.subscriptionStatus.set(channelId, 'UNSUBSCRIBING');
            try {
                await supabase.removeChannel(channel);
            } catch (e) {
                console.error("Error removing channel:", e);
            } finally {
                this.channels.delete(channelId);
                this.subscriptionStatus.delete(channelId);
            }
        }
    }

    /**
     * Remove todos os canais (útil em logout ou reset global)
     */
    public async unsubscribeAll() {
        const ids = Array.from(this.channels.keys());
        for (const id of ids) {
            await this.unsubscribe(id);
        }
        // Limpeza agressiva via SDK
        await supabase.removeAllChannels();
        this.channels.clear();
        this.subscriptionStatus.clear();
    }
}

export const channelManager = ChannelManager.getInstance();
