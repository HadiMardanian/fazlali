import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Query,
  ParseUUIDPipe,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { InitUploadDto } from './dto/init-upload.dto';
import { MultipartInitDto } from './dto/multipart-init.dto';
import { PartUrlDto } from './dto/part-url.dto';
import { MultipartCompleteDto } from './dto/multipart-complete.dto';
import { ListMediaDto } from './dto/list-media.dto';
import { ReportMediaDto } from './dto/report-media.dto';
import { ZipService } from '../zip/zip.service';

@Controller()
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly zipService: ZipService,
  ) {}

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

  @Get('rooms/:id/media')
  listMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-guest-token') guestToken?: string,
    @Query() query?: ListMediaDto,
  ) {
    return this.mediaService.listMedia(id, guestToken || '', query || {});
  }

  @Post('media/:id/like')
  likeMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    return this.mediaService.likeMedia(id, guestToken || '');
  }

  @Post('media/:id/report')
  reportMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportMediaDto,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    return this.mediaService.reportMedia(id, guestToken || '', dto);
  }

  @Post('media/:id/approve')
  approveMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-guest-token') moderatorToken?: string,
  ) {
    return this.mediaService.approveMedia(id, moderatorToken || '');
  }

  @Post('media/:id/reject')
  rejectMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-guest-token') moderatorToken?: string,
    @Body('note') note?: string,
  ) {
    return this.mediaService.rejectMedia(id, moderatorToken || '', note);
  }

  @Get('rooms/:id/blocked')
  getBlockedList(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.getBlockedList(id);
  }

  @Post('rooms/:id/zip')
  createZip(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-owner-id') ownerId?: string,
  ) {
    if (!ownerId) {
      throw new BadRequestException('Owner ID required');
    }
    return this.zipService.createZipRequest(id, ownerId);
  }

  @Get('zips/:id')
  getZip(@Param('id', ParseUUIDPipe) id: string) {
    return this.zipService.getZipDownload(id);
  }

  @Delete('media/:id')
  deleteMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-owner-id') ownerId?: string,
    @Query('roomId') roomId?: string,
  ) {
    if (!ownerId || !roomId) {
      throw new BadRequestException('Owner ID and roomId required');
    }
    return this.mediaService.deleteMedia(id, ownerId, roomId);
  }
}