import { applicationCors } from './cors-options';
import type { Request } from 'express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

describe('report image cross-origin delivery', () => {
  const path = '/api/zalo/report-image/' + 'a'.repeat(48) + '.png';
  function options(method: string, url: string): CorsOptions {
    let result: CorsOptions = {};
    applicationCors(['https://picklefund.vn'])({ method, path: url } as Request, (_, value) => { result = value; });
    return result;
  }
  it('lets Zalo clients fetch capability images without credentials', () => {
    for (const method of ['GET','HEAD','OPTIONS']) {
      expect(options(method,path)).toMatchObject({origin:'*',credentials:false,methods:['GET','HEAD']});
    }
  });
  it('keeps every other API, including malformed image URLs and writes, behind the origin allowlist', () => {
    for (const [method,url] of [['GET','/api/zalo/status'],['POST',path],['GET',path+'/other'],['GET','/api/zalo/report-image/guess.png']]) {
      const result=options(method,url); const check=result.origin as (origin:string|undefined, callback:Function)=>void;
      const denied=jest.fn(); check('https://chat.zalo.me',denied);
      expect(denied.mock.calls[0][0]).toBeInstanceOf(Error);
      const allowed=jest.fn(); check('https://picklefund.vn',allowed);
      expect(allowed).toHaveBeenCalledWith(null,true);
      expect(result.credentials).toBe(true);
    }
  });
});
