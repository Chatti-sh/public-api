export class ProfileFlag {
    constructor ({ signals, thresholds = {} }) {
        this.signals = signals;
        this.thresholds = {
            hide: .8,
            warn: .5,
            flag: 25,
            ...thresholds
        }
        this.totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    }

    // TODO: Reassess how to best tier multiple additive signals vs. definitive proof (eg. estimate age)
    
    check (character_data, chattish_profile) {
        const results = this.signals.map(signal => { 
            const result = signal.check(character_data, chattish_profile);
            const score   = typeof result === 'object' ? result.score   : result;
            const matches = typeof result === 'object' ? result.matches : [];
            return {
                id: signal.id,
                weight: signal.weight,
                score,
                matches,
                contribution: score * signal.weight
            }
        })

        const raw = results.reduce((sum, r) => sum + r.contribution, 0);
        console.log(raw);
        const confidence = raw / this.totalWeight;

        // Automatically force a result if a signal with force_action is at 1
        const forced = results.find(r => r.score >= 1.0 && this.signals.find(s => s.id === r.id)?.force_action);
        if (forced) {
            const action = this.signals.find(s => s.id === forced.id).force_action;
            return {
                confidence,
                percentage: Math.round(confidence * 100),
                action,
                signals: results.filter(r => r.score > 0)
            };
        }

        return {
            confidence,
            percentage: Math.round(confidence * 100),
            action:     this._getAction(confidence),
            signals:    results.filter(r => r.score > 0)
        };
    }

    _getAction(confidence) {
        if (confidence >= this.thresholds.hide) return 'hide';
        if (confidence >= this.thresholds.warn) return 'warn';
        if (confidence >= this.thresholds.flag) return 'flag';
        return 'none';
    }
}