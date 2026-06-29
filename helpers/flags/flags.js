import { underageCheck } from './checks/underage.js';

const CHECKS = {
    underage: underageCheck,
};

export function runAllChecks(character_data, chattish_profile) {
    return Object.fromEntries(
        Object.entries(CHECKS).map(([key, checker]) => [key, checker.check(character_data, chattish_profile)])
    );
}