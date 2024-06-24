import { writable, get } from 'svelte/store';
import {
    StateId,
    WebviewMessage,
    type AccountStateData,
    type CompilationStateData,
    type CompiledContract
} from '../../shared/types';
import { messageHandler } from '@estruyf/vscode/dist/client';

/**
 * frontend svelte data
 */

export const selectedAccount = writable<AccountStateData | undefined>(undefined);
export const selectedValue = writable<number | undefined>(undefined);

/**
 * backend data
 */

export const accounts = writable<AccountStateData[]>([]);
export const deployedContracts = writable<CompiledContract[]>([]);
export const compiledContracts = writable<CompilationStateData>(undefined);

/**
 * setup stores
 */

export async function setupStores() {
    setupListeners();
    await init();
}

async function init() {
    await messageHandler.request(WebviewMessage.onGetAccounts);
    await messageHandler.request(WebviewMessage.getState, StateId.DeployedContracts);
    await messageHandler.request(WebviewMessage.getState, StateId.CompiledContracts);
}

function setupListeners() {
    window.addEventListener('message', (event) => {
        if (!event.data.command) {
            return;
        }

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState: {
                if (stateId === StateId.DeployedContracts) {
                    if (payload === undefined) {
                        return;
                    }
                    deployedContracts.set(payload);
                }

                if (stateId === StateId.CompiledContracts) {
                    console.log('compiled contracts', payload);
                    if (payload === undefined) {
                        return;
                    }
                    compiledContracts.set(payload);
                    return;
                }

                if (stateId === StateId.Accounts) {
                    console.log('accounts', payload);
                    const _accounts = payload as AccountStateData[];
                    const _selectedAccount = get(selectedAccount);

                    // update accounts store
                    accounts.set(_accounts);

                    // if no accounts, reset selected account
                    if (_accounts.length === 0) {
                        selectedAccount.set(undefined);
                        return;
                    }

                    // check if selected account is still in the list, if not select the first account
                    if (
                        _selectedAccount === undefined ||
                        (_selectedAccount !== undefined &&
                            !_accounts.some(
                                (account) => account.address === _selectedAccount.address
                            ))
                    ) {
                        selectedAccount.set(_accounts[0]);
                        return;
                    }

                    // if selectedAccount is in payload, update selectedAccount
                    // @dev accounts.find should not return undefined, since checked above
                    selectedAccount.set(
                        _accounts.find((account) => account.address === _selectedAccount.address)
                    );

                    return;
                }

                break;
            }
        }
    });
}
