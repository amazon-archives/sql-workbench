import { Request, ResponseToolkit } from 'hapi-latest';
import { CLUSTER } from './utils/constants';

export default class TranslateService {
  private client: any;

  constructor(client) {
    this.client = client;
  }

  translateQuery = async (request: Request, h: ResponseToolkit, err?: Error) => {
    try {
      const params = {
        body: JSON.stringify(request.payload),
      };
      const { callWithRequest } = await this.client.getCluster(CLUSTER.SQL);
      const createResponse = await callWithRequest(request, 'sql.getTranslation', params);

      h({ ok: true, resp: createResponse });
    } catch (err) {
      console.error('SQL Console - Translate Service - translate:', err);
      h({ ok: false, resp: err.message });
    }
  };
}
