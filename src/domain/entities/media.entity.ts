import { MediaType, MediaStatus } from '../enums/media-type.enum.js';

export interface MediaProps {
  id: string;
  masjidId: string;
  mediaType: MediaType;
  storageProvider: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256Checksum: string;
  width?: number | null;
  height?: number | null;
  blurhash?: string | null;
  status: MediaStatus;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MediaEntity {
  constructor(private readonly props: MediaProps) {}

  get id(): string {
    return this.props.id;
  }

  get masjidId(): string {
    return this.props.masjidId;
  }

  get mediaType(): MediaType {
    return this.props.mediaType;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get status(): MediaStatus {
    return this.props.status;
  }

  public toJSON(): MediaProps {
    return { ...this.props };
  }
}
