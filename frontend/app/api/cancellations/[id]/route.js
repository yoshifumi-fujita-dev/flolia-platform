import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, internalErrorResponse } from '@/lib/api-response'

// DELETE: 休講削除
export async function DELETE(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = params

    const { error } = await supabase
      .from('class_cancellations')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Cancellation delete', error)
    }

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Cancellation DELETE', error)
  }
}
