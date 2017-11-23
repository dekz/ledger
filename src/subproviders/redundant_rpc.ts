import * as _ from 'lodash';
import {JSONRPCPayload} from '../types';
import promisify = require('es6-promisify');
import Subprovider = require('web3-provider-engine/subproviders/subprovider');
import RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
import dbg from 'debug';
const debug = dbg('0x:redundant-rpc');

export class RedundantRPCSubprovider extends Subprovider {
    private rpcs: RpcSubprovider[];
    constructor(endpoints: string[]) {
        super();
        this.rpcs = _.map(endpoints, endpoint => {
            return new RpcSubprovider({
                rpcUrl: endpoint,
            });
        });
    }
    public async handleRequest(payload: JSONRPCPayload, next: () => void,
                               end: (err?: Error, data?: any) =>  void): Promise<void> {
        const rpcsCopy = this.rpcs.slice();
        try {
            const data = await this.firstSuccessAsync(rpcsCopy, payload, next);
            end(undefined, data);
        } catch (err) {
            end(err);
        }

    }
    private async firstSuccessAsync(rpcs: RpcSubprovider[], payload: JSONRPCPayload, next: () => void): Promise<any> {
        let lastErr: Error|undefined = undefined;
        for (const rpc of rpcs) {
            try {
                const data = await promisify(rpc.handleRequest.bind(rpc))(payload, next);
                return data;
            } catch (err) {
                debug(err);
                lastErr = err;
                continue;
            }
        }
        if (!_.isUndefined(lastErr)) {
            debug('exhausted');
            throw lastErr;
        }
    }
}