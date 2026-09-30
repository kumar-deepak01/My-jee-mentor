import {handleFacultyRequest} from './_faculty-handler.js';

export default {
  async fetch(request){
    return handleFacultyRequest(request);
  }
};
