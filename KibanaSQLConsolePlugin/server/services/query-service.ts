import { Request, ResponseToolkit } from 'hapi-latest';
import { CLUSTER } from './utils/constants';

export default class QueryService {
  private client: any;

  constructor(client) {
    this.client = client;
  }

  describeQuery = async (request: Request, h: ResponseToolkit, err?: Error) => {
    try {
      const params = {
        body: JSON.stringify(request.payload),
      };

      const { callWithRequest } = await this.client.getCluster(CLUSTER.SQL);
      const createResponse = await callWithRequest(request, 'sql.query', params);

      h({ ok: true, resp: JSON.stringify(createResponse) });
    } catch (err) {
      console.error('SQL Console - Query Service - describeQuery:', err);
      h({ ok: false, resp: err.message });
    }
  };

  describeQueryCsv = async (request: Request, h: ResponseToolkit, err?: Error) => {
    try {
      const params = {
        body: JSON.stringify(request.payload),
      };
      const { callWithRequest } = await this.client.getCluster(CLUSTER.SQL);
      const createResponse = await callWithRequest(request, 'sql.getCsv', params);

      h({ ok: true, resp: JSON.stringify(createResponse) });
    } catch (err) {
      console.error('SQL Console - Query Service - describeQueryCsv:', err);
      h({ ok: false, resp: err.message });
    }
  };

  describeQueryJdbc = async (request: Request, h: ResponseToolkit, err?: Error) => {
    try {
      const params = {
        body: JSON.stringify(request.payload),
      };
      const { callWithRequest } = await this.client.getCluster(CLUSTER.SQL);
      const createResponse = await callWithRequest(request, 'sql.getJdbc', params);

      h({ ok: true, resp: JSON.stringify(createResponse) });
    } catch (err) {
      console.error('SQL Console - Query Service - describeQueryJdbc:', err);
      h({ ok: false, resp: err.message });
    }
  };
}
