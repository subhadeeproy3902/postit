import { NextRequest, NextResponse } from 'next/server';
import { convertMarkdownToLinkedInFormat } from '@/lib/markdown-to-unicode';

// Register LinkedIn media upload and get asset URN + upload URL
async function registerMediaUpload(accessToken: string, userUrn: string, mediaType: 'image' | 'video') {
  const recipe = mediaType === 'video' 
    ? 'urn:li:digitalmediaRecipe:feedshare-video' 
    : 'urn:li:digitalmediaRecipe:feedshare-image';
    
  const resp = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [recipe],
        owner: userUrn,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    console.error(`Failed to register ${mediaType} upload:`, errorText);
    throw new Error(`Failed to register ${mediaType} upload: ${errorText}`);
  }
  return resp.json();
}

// Upload binary media buffer to LinkedIn CDN upload URL
async function uploadMediaBuffer(uploadUrl: string, fileBuffer: Buffer) {
  const resp = await fetch(uploadUrl, {
    method: 'PUT',
    body: new Uint8Array(fileBuffer),
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    console.error('Failed to upload media:', errorText);
    throw new Error(`Failed to upload media: ${errorText}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, mediaFiles, accessToken, linkedinId } = await request.json();

    console.log('Received request with accessToken:', !!accessToken, 'linkedinId:', linkedinId);

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!linkedinId) {
      return NextResponse.json({ error: 'LinkedIn user ID not found. Please sign out and sign back in.' }, { status: 401 });
    }

    const userUrn = `urn:li:person:${linkedinId}`;
    console.log('Using LinkedIn user URN:', userUrn);

    // Process media files if any
    const linkedInMedia: LinkedInMediaItem[] = [];
    if (mediaFiles && mediaFiles.length > 0) {
      console.log(`Processing ${mediaFiles.length} media files for LinkedIn upload...`);
      
      for (const media of mediaFiles) {
        try {
          console.log(`Processing ${media.type}: ${media.title}`);
          
          const reg = await registerMediaUpload(accessToken, userUrn, media.type);
          const asset = reg.value.asset;
          const uploadUrl = reg.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
          
          await uploadMediaBuffer(uploadUrl, Buffer.from(media.fileBuffer, 'base64'));
          
          const mediaCategory: 'IMAGE' | 'VIDEO' = media.type === 'video' ? 'VIDEO' : 'IMAGE';
          
          linkedInMedia.push({
            status: 'READY',
            description: { text: media.title || 'Shared via Content Control Panel' },
            media: asset,
            title: { text: media.title || (media.type === 'video' ? 'Video' : 'Image') },
            mediaCategory: mediaCategory,
          });
          
          console.log(`Successfully uploaded ${media.type}: ${media.title}`);
        } catch (error) {
          console.error(`Failed to upload ${media.type} ${media.title}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return NextResponse.json({ 
            error: `Failed to upload ${media.type}: ${media.title}. ${errorMessage}` 
          }, { status: 500 });
        }
      }
    }
    
    return await createPost(accessToken, userUrn, content, linkedInMedia);
  } catch (error) {
    console.error('Error posting to LinkedIn:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface LinkedInMediaItem {
  status: string;
  description: { text: string };
  media: string;
  title: { text: string };
  mediaCategory: 'IMAGE' | 'VIDEO';
}

async function createPost(accessToken: string, userUrn: string, content: string, linkedInMedia: LinkedInMediaItem[]) {
  // Determine media category based on uploaded media
  let shareMediaCategory = 'NONE';
  if (linkedInMedia.length > 0) {
    const hasVideo = linkedInMedia.some((media) => media.mediaCategory === 'VIDEO');
    const hasImage = linkedInMedia.some((media) => media.mediaCategory === 'IMAGE');
    
    if (hasVideo && hasImage) {
      shareMediaCategory = 'IMAGE'; // LinkedIn defaults to IMAGE for mixed media
    } else if (hasVideo) {
      shareMediaCategory = 'VIDEO';
    } else {
      shareMediaCategory = 'IMAGE';
    }
  }

  const postData = {
    author: userUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: convertMarkdownToLinkedInFormat(content)
        },
        shareMediaCategory: shareMediaCategory,
        ...(linkedInMedia.length > 0 && { media: linkedInMedia }),
      },
    },
    visibility: { 
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' 
    },
  };

  console.log('Posting to LinkedIn API with data:', JSON.stringify(postData, null, 2));

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('LinkedIn API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorData
    });
    
    let errorMessage = 'Failed to post to LinkedIn';
    
    // Parse LinkedIn API error for better user feedback
    try {
      const parsedError = JSON.parse(errorData);
      if (parsedError.message) {
        errorMessage = parsedError.message;
      } else if (parsedError.errorDetail && parsedError.errorDetail.message) {
        errorMessage = parsedError.errorDetail.message;
      }
    } catch {
      // If parsing fails, use default message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorData,
        status: response.status 
      }, 
      { status: response.status }
    );
  }

  const result = await response.json();
  return NextResponse.json({ 
    success: true, 
    postId: result.id, 
    message: 'Successfully posted to LinkedIn!' 
  });
}