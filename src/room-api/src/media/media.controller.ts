import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { InitUploadDto } from './dto/init-upload.dto';
import { MultipartInitDto } from './dto/multipart-init.dto';
import { PartUrlDto } from './dto/part-url.dto';
import { MultipartCompleteDto } from './dto/multipart-complete.dto';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('rooms/:id/media:init')
  initUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitUploadDto,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    return this.mediaService.initUpload(id, dto, guestToken || '');
  }

  @Post('media/:id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.complete(id);
  }

  @Post('media/:id/multipart:init')
  multipartInit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MultipartInitDto,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    return this.mediaService.multipartInit(id, dto, guestToken || '');
  }

  @Post('media/:id/multipart:part-url')
  multipartPartUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartUrlDto,
  ) {
    return this.mediaService.multipartPartUrl(id, dto.partNumber);
  }

  @Post('media/:id/multipart:complete')
  multipartComplete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MultipartCompleteDto,
  ) {
    return this.mediaService.multipartComplete(id, dto.parts);
  }

  @Post('media/:id/multipart:abort')
  multipartAbort(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.multipartAbort(id);
  }
}